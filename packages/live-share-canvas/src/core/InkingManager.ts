/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TypedEventEmitter } from "@fluid-internal/client-utils";
import {
    CanvasReferencePoint,
    InkingCanvas,
    DryCanvas,
    WetCanvas,
    LaserPointerCanvas,
} from "../canvas";
import {
    IPoint,
    IPointerPoint,
    IRect,
    screenToViewport,
    combineRects,
    viewportToScreen,
} from "./Geometry";
import {
    Stroke,
    IStroke,
    IStrokeCreationOptions,
    StrokeType,
    StrokeMode,
    IRawStroke,
} from "./Stroke";
import {
    InputFilter,
    InputFilterCollection,
    JitterFilter,
    IPointerEvent,
    InputProvider,
    PointerInputProvider,
    IPointerMoveEvent,
} from "../input";
import {
    DefaultHighlighterBrush,
    DefaultLaserPointerBrush,
    DefaultLineBrush,
    DefaultPenBrush,
    IBrush,
} from "./Brush";
import {
    makeRectangle,
    generateUniqueId,
    isPointInsideRectangle,
    computeQuadPath,
    renderQuadPathToSVG,
    ChangeLog,
    EphemeralCanvas,
    WetLineStroke,
    WetStroke,
    WetFreehandStroke,
} from "./internals";
import { IEvent } from "@fluidframework/core-interfaces";
import {
    AddPointsEvent,
    BeginStrokeEvent,
    ClearEvent,
    InkingTool,
    PointerMovedEvent,
    StrokeEndState,
    StrokesAddedEvent,
    StrokesRemovedEvent,
} from "./InkingManager-constants";
import {
    IAddPointsEventArgs,
    IAddRemoveStrokeOptions,
    IBeginStrokeEventArgs,
    IPointerMovedEventArgs,
    IWetStroke,
} from "./InkingManager-interfaces";

type StrokeBasedTool =
    | InkingTool.pen
    | InkingTool.line
    | InkingTool.laserPointer
    | InkingTool.highlighter;

/**
 * Events emitted by the `InkingManager` class.
 */
export interface IInkingManagerEvents extends IEvent {
    /**
     * Event listener for when the user's pointer is moved over the canvas element
     * @param event update
     * @param listener listener function
     * @param listener.event the `IPointerMovedEventArgs` event
     */
    (
        event: "PointerMoved",
        listener: (event: IPointerMovedEventArgs) => void
    ): void;
    /**
     * Event listener for when strokes are added to the canvas element
     * @param event update
     * @param listener listener function
     * @param listener.strokes list of strokes that were added
     */
    (event: "StrokesAdded", listener: (strokes: IStroke[]) => void): void;
    /**
     * Event listener for when strokes are removed from the canvas element
     * @param event update
     * @param listener listener function
     * @param listener.strokeIds list of stroke ids that were removed
     */
    (event: "StrokesRemoved", listener: (strokeIds: string[]) => void): void;
    /**
     * Event listener for when all strokes are cleared from the canvas element.
     * @see InkingManager.clear
     * @param event update
     * @param listener listener function
     */
    (event: "Clear", listener: () => void): void;
    /**
     * Event listener for when a stroke begins.
     * @param event update
     * @param listener listener function
     * @param listener.event event object with information about the stroke that begun
     */
    (
        event: "BeginStroke",
        listener: (event: IBeginStrokeEventArgs) => void
    ): void;
    /**
     * Event listener for when points are added to a stroke.
     * Also called when the stroke ends.
     * @param event update
     * @param listener listener function
     * @param listener.event event object with information about the added points
     */
    (event: "AddPoints", listener: (event: IAddPointsEventArgs) => void): void;
}

/**
 * Handles user interaction with a canvas, and manages the rendering of wet and dry strokes.
 */
export class InkingManager extends TypedEventEmitter<IInkingManagerEvents> {
    /**
     * Configures the amount of time to wait before sending a pointer moved event. This delay
     * allows for the elimination of fast, consecutive pointer move events, and only send the
     * most recent update.
     */
    private static readonly pointerMovedNotificationDelay = 15;

    /**
     * Configures the amount of time to wait before processing eraser strokes. This delay allows
     * the collection of changes that can be handled as a batch.
     */
    private static readonly pointEraserProcessingInterval = 30;

    /**
     * Configures the amount of time to wait before flushing the change log, giving it time to
     * accumulate changes that can then be handled as a batch.
     */
    private static readonly changeLogFlushInterval = 60;

    /**
     * The default client Id of the device running the application.
     */
    public static readonly localClientId = generateUniqueId();

    /**
     * Configures the amount of time an ephemeral canvas (i.e. a canvas that renders ephemeral
     * strokes) remains ready for new strokes before being faded out and removed.
     */
    public static ephemeralCanvasRemovalDelay = 1500;

    /**
     * Configures whether the Ctrl, Shift and Alt keys can be used to alter the way strokes
     * are drawn using various tools.
     */
    public static enableStrokeModifierHotKeys = true;

    private static ScreenToViewportCoordinateTransform = class extends InputFilter {
        constructor(private _owner: InkingManager) {
            super();
        }

        filterPoint(p: IPointerPoint): IPointerPoint {
            return {
                ...this._owner.screenToViewport(p),
                pressure: p.pressure,
            };
        }
    };

    private readonly _hostElement: HTMLElement;
    private readonly _canvasPoolHost: HTMLElement;
    private readonly _dryCanvas: InkingCanvas;

    private _inputFilters: InputFilterCollection;
    private _penBrush: IBrush = { ...DefaultPenBrush };
    private _lineBrush: IBrush = { ...DefaultLineBrush };
    private _highlighterBrush: IBrush = { ...DefaultHighlighterBrush };
    private _laserPointerBrush: IBrush = { ...DefaultLaserPointerBrush };
    private _tool: InkingTool = InkingTool.pen;
    private _inputProvider!: InputProvider;
    private _currentStroke?: IWetStroke;
    private _strokes: Map<string, IStroke> = new Map<string, IStroke>();
    private _reRenderTimeout?: number;
    private _pointerMovedNotificationTimeout?: number;
    private _pointEraseProcessingInterval?: number;
    private _changeLogFlushTimeout?: number;
    private _pendingPointErasePoints: IPoint[] = [];
    private _changeLog: ChangeLog = new ChangeLog();
    private _isUpdating: boolean = false;
    private _hostResizeObserver: ResizeObserver;
    private _referencePoint: CanvasReferencePoint = "center";
    private _offset: Readonly<IPoint> = { x: 0, y: 0 };
    private _scale: number = 1;
    private _clientWidth?: number;
    private _clientHeight?: number;
    private _centerX?: number;
    private _centerY?: number;
    private _ephemeralCanvases: Map<string, EphemeralCanvas> = new Map<
        string,
        EphemeralCanvas
    >();
    private _lastPointerMovePosition?: IPoint;

    private onHostResized = (
        entries: ResizeObserverEntry[],
        observer: ResizeObserver
    ) => {
        this._clientWidth = undefined;
        this._clientHeight = undefined;
        this._centerX = undefined;
        this._centerY = undefined;

        if (entries.length >= 1) {
            const entry = entries[0];

            this._canvasPoolHost.style.width = entry.contentRect.width + "px";
            this._canvasPoolHost.style.height = entry.contentRect.height + "px";

            this._dryCanvas.resize(
                entry.contentRect.width,
                entry.contentRect.height
            );

            // Re-render synchronously to avoid flicker
            this.reRender();
        }
    };

    private reRender() {
        this._dryCanvas.clear();

        this._dryCanvas.offset = this._offset;
        this._dryCanvas.scale = this._scale;

        const sortedStrokes = Array.from(this._strokes.values()).sort(
            (stroke1: IStroke, stroke2: IStroke) => {
                return stroke1.timeStamp - stroke2.timeStamp;
            }
        );

        for (const stroke of sortedStrokes) {
            this._dryCanvas.renderStroke(stroke);
        }
    }

    private scheduleReRender() {
        if (this._reRenderTimeout !== undefined) {
            window.cancelAnimationFrame(this._reRenderTimeout);
        }

        this._reRenderTimeout = window.requestAnimationFrame(() => {
            this.reRender();

            this._reRenderTimeout = undefined;
        });
    }

    private flushChangeLog() {
        if (this._changeLogFlushTimeout) {
            window.clearTimeout(this._changeLogFlushTimeout);

            this._changeLogFlushTimeout = undefined;
        }

        if (this._changeLog.hasChanges) {
            this.notifyStrokesRemoved(this._changeLog.getRemovedStrokes());
            this.notifyStrokesAdded(this._changeLog.getAddedStrokes());

            this._changeLog.clear();
        }
    }

    private scheduleChangeLogFlush() {
        if (this._changeLogFlushTimeout === undefined) {
            this._changeLogFlushTimeout = window.setTimeout(() => {
                this._changeLogFlushTimeout = undefined;

                this.flushChangeLog();
            }, InkingManager.changeLogFlushInterval);
        }
    }

    private processPendingPointErasePoints() {
        for (let p of this._pendingPointErasePoints) {
            this.internalPointErase(p);
        }

        this._pendingPointErasePoints = [];
    }

    private schedulePointEraseProcessing() {
        if (this._pointEraseProcessingInterval === undefined) {
            this._pointEraseProcessingInterval = window.setTimeout(() => {
                this.processPendingPointErasePoints();

                this._pointEraseProcessingInterval = undefined;

                this.scheduleChangeLogFlush();
            }, InkingManager.pointEraserProcessingInterval);
        }
    }

    private getBrushForTool(tool: StrokeBasedTool): IBrush {
        switch (tool) {
            case InkingTool.laserPointer:
                return this.laserPointerBrush;
            case InkingTool.highlighter:
                return this.highlighterBrush;
            case InkingTool.line:
                return this.lineBrush;
            default:
                return this.penBrush;
        }
    }

    private cancelCurrentStroke(p: IPointerPoint) {
        if (this._currentStroke !== undefined) {
            this._currentStroke.cancel();

            this.notifyEndStroke(this._currentStroke.id, p, true);

            this._currentStroke = undefined;
        }
    }

    private onPointerDown = (e: IPointerEvent): void => {
        this._inputFilters.reset(e);

        const filteredPoint = this._inputFilters.filterPoint(e);

        this.cancelCurrentStroke(filteredPoint);

        switch (this.tool) {
            case InkingTool.pen:
            case InkingTool.line:
            case InkingTool.highlighter:
            case InkingTool.laserPointer:
                // eslint-disable-next-line no-case-declarations
                const mode =
                    this.tool === InkingTool.line
                        ? StrokeMode.line
                        : e.ctrlKey && InkingManager.enableStrokeModifierHotKeys
                        ? StrokeMode.line
                        : StrokeMode.freeHand;
                // eslint-disable-next-line no-case-declarations
                const brush = { ...this.getBrushForTool(this.tool) };

                if (e.altKey && InkingManager.enableStrokeModifierHotKeys) {
                    brush.endArrow = "open";
                }

                this._currentStroke = this.beginWetStroke(
                    this.tool === InkingTool.laserPointer
                        ? StrokeType.ephemeral
                        : StrokeType.persistent,
                    mode,
                    filteredPoint,
                    { brush }
                );

                this.notifyBeginStroke(this._currentStroke);

                break;
            case InkingTool.eraser:
                this.erase(filteredPoint);

                break;
            case InkingTool.pointEraser:
                this._pendingPointErasePoints.push(filteredPoint);

                this.schedulePointEraseProcessing();

                break;
        }
    };

    private onPointerMove = (e: IPointerMoveEvent): void => {
        // The laser pointer is displayed while hovering over the inking surface. We activate
        // it if there's not pointer captured
        if (!e.isPointerDown) {
            if (this.tool === InkingTool.laserPointer) {
                if (this._currentStroke === undefined) {
                    this._inputFilters.reset(e);

                    const filteredPoint = this._inputFilters.filterPoint(e);

                    this._currentStroke = this.beginWetStroke(
                        StrokeType.laserPointer,
                        StrokeMode.freeHand,
                        filteredPoint,
                        {
                            brush: this.getBrushForTool(this.tool),
                        }
                    );

                    this.notifyBeginStroke(this._currentStroke);
                } else {
                    const filteredPoint = this._inputFilters.filterPoint(e);

                    this._currentStroke.addPoints(filteredPoint);

                    this.notifyAddPoints(this._currentStroke.id, filteredPoint);
                }
            } else {
                const filteredPoint = this._inputFilters.filterPoint(e);

                this.queuePointerMovedNotification(filteredPoint);
            }
        }
        // Otherwise, we handle the pointer move event only if the pointer it comes
        // from is the one we have captured
        else {
            let filteredPoint = this._inputFilters.filterPoint(e);

            if (this._currentStroke) {
                if (e.shiftKey && InkingManager.enableStrokeModifierHotKeys) {
                    filteredPoint =
                        this._currentStroke.straighten(filteredPoint);
                }

                this._currentStroke.addPoints(filteredPoint);

                this.notifyAddPoints(this._currentStroke.id, filteredPoint);
            } else {
                switch (this.tool) {
                    case InkingTool.eraser:
                        this.erase(filteredPoint);

                        this.queuePointerMovedNotification(filteredPoint);

                        break;
                    case InkingTool.pointEraser:
                        this._pendingPointErasePoints.push(filteredPoint);

                        this.queuePointerMovedNotification(filteredPoint);

                        this.schedulePointEraseProcessing();

                        break;
                }
            }
        }
    };

    private onPointerUp = (e: IPointerEvent): void => {
        let filteredPoint = this._inputFilters.filterPoint(e);

        if (this._currentStroke) {
            if (e.shiftKey && InkingManager.enableStrokeModifierHotKeys) {
                filteredPoint = this._currentStroke.straighten(filteredPoint);
            }

            this._currentStroke.addPoints(filteredPoint);
            this._currentStroke.end();

            this.notifyEndStroke(this._currentStroke.id, filteredPoint);

            this._currentStroke = undefined;
        }

        // No necessary logic for other tools on pointer up

        this.flushChangeLog();
    };

    private onPointerLeave = (e: IPointerEvent): void => {
        if (this.tool === InkingTool.laserPointer) {
            const filteredPoint = this._inputFilters.filterPoint(e);

            this.cancelCurrentStroke(filteredPoint);
        } else {
            this.queuePointerMovedNotification();
        }
    };

    private internalAddStroke(
        stroke: IStroke,
        options?: IAddRemoveStrokeOptions
    ) {
        const effectiveOptions: Required<IAddRemoveStrokeOptions> = {
            forceReRender: options ? options.forceReRender ?? false : false,
            addToChangeLog: options ? options.addToChangeLog ?? true : true,
        };

        if (effectiveOptions.forceReRender || this._strokes.has(stroke.id)) {
            this._strokes.set(stroke.id, stroke);

            effectiveOptions.forceReRender
                ? this.reRender()
                : this.scheduleReRender();
        } else {
            this._strokes.set(stroke.id, stroke);

            if (!this._reRenderTimeout) {
                this._dryCanvas.renderStroke(stroke);
            }
        }

        if (effectiveOptions.addToChangeLog) {
            this._changeLog.addStroke(stroke);
        }
    }

    private wetStrokeEnded = (stroke: IWetStroke, isCancelled: boolean) => {
        if (!isCancelled) {
            if (stroke.type === StrokeType.ephemeral) {
                const effectiveClientId =
                    stroke.clientId ?? InkingManager.localClientId;

                let ephemeralCanvas =
                    this._ephemeralCanvases.get(effectiveClientId);

                if (!ephemeralCanvas) {
                    ephemeralCanvas = new EphemeralCanvas(
                        effectiveClientId,
                        this._canvasPoolHost
                    );
                    ephemeralCanvas.offset = this.offset;
                    ephemeralCanvas.scale = this.scale;

                    this._ephemeralCanvases.set(
                        effectiveClientId,
                        ephemeralCanvas
                    );
                }

                ephemeralCanvas.renderStroke(stroke);

                ephemeralCanvas.scheduleRemoval((sender: EphemeralCanvas) => {
                    this._ephemeralCanvases.delete(sender.clientId);
                });
            } else if (stroke.type === StrokeType.persistent) {
                this.internalAddStroke(stroke);
            }
        }
    };

    private internalErase(p: IPoint): ChangeLog {
        const result = new ChangeLog();
        const eraserRect = makeRectangle(p, this.eraserSize, this.eraserSize);

        this._strokes.forEach((stroke: IStroke) => {
            if (stroke.length === 1) {
                if (isPointInsideRectangle(stroke.getPointAt(0), eraserRect)) {
                    result.removeStroke(stroke.id);
                }
            } else if (stroke.intersectsWithRectangle(eraserRect)) {
                result.removeStroke(stroke.id);
            }
        });

        if (result.hasChanges) {
            result.getRemovedStrokes().forEach((id: string) => {
                this._strokes.delete(id);
            });

            this.scheduleReRender();

            this._changeLog.mergeChanges(result);
        }

        return result;
    }

    private internalPointErase(p: IPoint): ChangeLog {
        const result = new ChangeLog();
        const eraserRect = makeRectangle(p, this.eraserSize, this.eraserSize);

        this._strokes.forEach((stroke: IStroke) => {
            const strokes = stroke.pointErase(eraserRect);

            if (strokes) {
                result.removeStroke(stroke.id);

                for (const s of strokes) {
                    result.addStroke(s);
                }
            }
        });

        if (result.hasChanges) {
            result.getRemovedStrokes().forEach((id: string) => {
                this._strokes.delete(id);
            });

            result.getAddedStrokes().forEach((stroke: IStroke) => {
                this._strokes.set(stroke.id, stroke);
            });

            this.scheduleReRender();

            this._changeLog.mergeChanges(result);
        }

        return result;
    }

    private queuePointerMovedNotification(position?: IPoint) {
        this._lastPointerMovePosition = position;

        if (this._pointerMovedNotificationTimeout === undefined) {
            this._pointerMovedNotificationTimeout = window.setTimeout(() => {
                this.notifyPointerMoved(this._lastPointerMovePosition);

                this._pointerMovedNotificationTimeout = undefined;
            }, InkingManager.pointerMovedNotificationDelay);
        }
    }

    private notifyPointerMoved(position?: IPoint) {
        const eventArgs: IPointerMovedEventArgs = {
            position,
        };

        this.emit(PointerMovedEvent, eventArgs);
    }

    private notifyStrokesAdded(strokes: IStroke[]) {
        if (strokes.length > 0) {
            this.emit(StrokesAddedEvent, strokes);
        }
    }

    private notifyStrokesRemoved(strokeIds: string[]) {
        if (strokeIds.length > 0) {
            this.emit(StrokesRemovedEvent, strokeIds);
        }
    }

    private notifyClear() {
        this.emit(ClearEvent);
    }

    private notifyBeginStroke(stroke: IWetStroke) {
        const eventArgs: IBeginStrokeEventArgs = {
            strokeId: stroke.id,
            brush: stroke.brush,
            startPoint: stroke.getPointAt(0),
            type: stroke.type,
            mode: stroke.mode,
        };

        this.emit(BeginStrokeEvent, eventArgs);
    }

    private notifyAddPoints(strokeId: string, ...points: IPointerPoint[]) {
        const eventArgs: IAddPointsEventArgs = {
            strokeId,
            points,
        };

        this.emit(AddPointsEvent, eventArgs);
    }

    private notifyEndStroke(
        strokeId: string,
        endPoint?: IPointerPoint,
        isCancelled: boolean = false
    ) {
        const eventArgs: IAddPointsEventArgs = {
            strokeId,
            points: endPoint ? [endPoint] : [],
            endState: isCancelled
                ? StrokeEndState.cancelled
                : StrokeEndState.ended,
        };

        this.emit(AddPointsEvent, eventArgs);
    }

    private createInputFilterCollection(
        inputFilters?: InputFilter[]
    ): InputFilterCollection {
        const result = new InputFilterCollection();

        inputFilters
            ? result.addFilters(...inputFilters)
            : result.addFilters(new JitterFilter());

        result.addFilters(
            new InkingManager.ScreenToViewportCoordinateTransform(this)
        );

        return result;
    }

    /**
     * The size of the eraser.
     */
    public eraserSize: number = 20;

    /**
     * Creates a new InkingManager instance.
     * @param hostElement The HTML element to host the canvases and other DOM elements handled by
     * the InkingManager instance. `hostElement` shouldn't have any children. The
     * InkingManager instance might change its attributes, including its style.
     */
    constructor(hostElement: HTMLElement) {
        super();

        this._inputFilters = this.createInputFilterCollection();

        this._hostElement = hostElement;

        this._dryCanvas = new DryCanvas(this._hostElement);

        this._canvasPoolHost = document.createElement("div");
        this._canvasPoolHost.style.position = "absolute";
        this._canvasPoolHost.style.pointerEvents = "none";

        this._hostElement.appendChild(this._canvasPoolHost);

        this.inputProvider = new PointerInputProvider(this._dryCanvas.canvas);

        this._hostResizeObserver = new ResizeObserver(this.onHostResized);
        this._hostResizeObserver.observe(this._hostElement);
    }

    /**
     * Sets the input filters to use with this InkingManager instance. By default, a jitter
     * reduction filter is used.
     * @param inputFilters The input filters to use, in the order provided. If `undefined` is
     * passed, the default input filters are used.
     */
    public setInputFilters(inputFilters?: InputFilter[]) {
        this._inputFilters = this.createInputFilterCollection(inputFilters);
    }

    /**
     * Temporarily blocks the emission of `StrokesAddedEvent` and `StrokesRemovedEvents` in order
     * to batch updates (via `addStroke` and `removeStroke`) into the change log. Once the
     * updates are done, `endUpdate` must be called.
     */
    public beginUpdate() {
        this._isUpdating = true;
    }

    /**
     * Unblocks the emission of update events and flushes the change log, leading to a single
     * `StrokesAddedEvent` and/or a single `StrokesRemovedEvent`.
     */
    public endUpdate() {
        if (this._isUpdating) {
            this._isUpdating = false;

            this.flushChangeLog();
        }
    }

    /**
     * Starts listening to pointer input.
     */
    public activate(): void {
        this._inputProvider.activate();
    }

    /**
     * Stops listening to pointer input.
     */
    public deactivate(): void {
        this._inputProvider.deactivate();
    }

    /**
     * Clears the canvas.
     */
    public clear() {
        this._strokes.clear();

        this.scheduleReRender();

        this.notifyClear();
    }

    /**
     * Exports the current drawing as a collection of raw strokes.
     * @returns A collection or raw strokes.
     */
    public exportRaw(): IRawStroke[] {
        const result: IRawStroke[] = [];

        this._strokes.forEach((stroke: IStroke) => {
            result.push({
                points: stroke.getAllPoints(),
                brush: { ...stroke.brush },
            });
        });

        return result;
    }

    /**
     * Exports the current drawing to an SVG.
     * @returns A serialized SVG string.
     */
    public exportSVG(): string {
        let shapes = "";
        let viewBox: IRect | undefined;
        let largestTipSize = 0;

        this._strokes.forEach((stroke: IStroke) => {
            const boundingRect = stroke.getBoundingRect();

            viewBox = viewBox
                ? combineRects(viewBox, boundingRect)
                : boundingRect;

            if (stroke.brush.tipSize > largestTipSize) {
                largestTipSize = stroke.brush.tipSize;
            }

            const quadPath = computeQuadPath(
                stroke.getAllPoints(),
                0,
                stroke.brush.tip,
                stroke.brush.tipSize
            );

            let path = renderQuadPathToSVG(
                quadPath,
                stroke.brush.tip,
                stroke.brush.color
            );

            if (stroke.brush.type === "highlighter") {
                path = `<g opacity="${InkingCanvas.highlighterOpacity}">${path}</g>`;
            }

            shapes += path;
        });

        let svgViewBox = "";

        if (viewBox) {
            const halfTipSize = largestTipSize / 2;

            // Add half the maximum brush tip size on each side
            // of the view box, otherwise parts of some strokes
            // would be clipped.
            viewBox.left -= halfTipSize;
            viewBox.top -= halfTipSize;
            const viewBoxWidth = viewBox.right - viewBox.left + largestTipSize;
            const viewBoxHeight = viewBox.bottom - viewBox.top + largestTipSize;

            svgViewBox = `viewBox="${viewBox.left} ${viewBox.top} ${viewBoxWidth} ${viewBoxHeight}"`;
        }

        return `<svg ${svgViewBox} xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
    }

    /**
     * Imports (adds) the specified strokes into the drawing.
     * @param rawStrokes The strokes to import.
     */
    public importRaw(rawStrokes: IRawStroke[]) {
        for (const rawStroke of rawStrokes) {
            const stroke = new Stroke({
                brush: rawStroke.brush,
                points: rawStroke.points,
                clientId: InkingManager.localClientId,
                version: 1,
            });

            this.addStroke(stroke);
        }
    }

    /**
     * Starts a new wet stroke which will be drawn progressively on the canvas. Multiple wet strokes
     * can be created at the same time and will not interfere with each other.
     * @param strokeType The type of the stroke to start.
     * @param strokeKind The kind of stroke to start.
     * @param startPoint The starting point of the stroke.
     * @param options Creation options, such as id, points, brush...
     * @returns An IWetStroke object representing the ongoing stroke.
     */
    public beginWetStroke(
        strokeType: StrokeType,
        strokeKind: StrokeMode,
        startPoint: IPointerPoint,
        options?: IStrokeCreationOptions
    ): IWetStroke {
        const canvas =
            strokeType === StrokeType.laserPointer
                ? new LaserPointerCanvas(this._canvasPoolHost)
                : new WetCanvas(this._canvasPoolHost);
        canvas.resize(this.clientWidth, this.clientHeight);
        canvas.offset = this.offset;
        canvas.scale = this.scale;
        canvas.referencePoint = this.referencePoint;

        let stroke: WetStroke;

        if (strokeKind === StrokeMode.line) {
            stroke = new WetLineStroke(canvas, strokeType, strokeKind, options);
        } else {
            stroke = new WetFreehandStroke(
                canvas,
                strokeType,
                strokeKind,
                options
            );
        }

        stroke.onStrokeEnded = this.wetStrokeEnded;
        stroke.addPoints(startPoint);

        return stroke;
    }

    /**
     * Retrieves an existing stroke from the drawing.
     * @param id The id of the stroke to retrieve.
     * @returns The stroke with the specified id.
     */
    public getStroke(id: string): IStroke | undefined {
        return this._strokes.get(id);
    }

    /**
     * Adds a stroke to the drawing.
     * @param stroke The stroke to add. If a stroke with the same id already exists
     * in the drawing, is it replaced.
     * @param options Options allowing the caller to force a re-render and/or block the
     * emission of `StrokesAddedEvent`.
     */
    public addStroke(stroke: IStroke, options?: IAddRemoveStrokeOptions) {
        this.internalAddStroke(stroke, options);

        if (!this._isUpdating) {
            this.flushChangeLog();
        }
    }

    /**
     * Removes a stroke from the drawing.
     * @param id The id of the stroke to remove. If the stroke doesn't exist, nothing
     * happens.
     * @param options Options allowing the caller to force a re-render and/or block the
     * emission of `StrokesRemovedEvent`.
     */
    public removeStroke(id: string, options?: IAddRemoveStrokeOptions) {
        if (this._strokes.delete(id)) {
            const effectiveOptions: Required<IAddRemoveStrokeOptions> = {
                forceReRender: options ? options.forceReRender ?? false : false,
                addToChangeLog: options ? options.addToChangeLog ?? true : true,
            };

            effectiveOptions.forceReRender
                ? this.reRender()
                : this.scheduleReRender();

            if (effectiveOptions.addToChangeLog) {
                this._changeLog.removeStroke(id);
            }

            if (!this._isUpdating) {
                this.flushChangeLog();
            }
        }
    }

    /**
     * Entirely removes any strokes that intersect with the eraser rectangle.
     * @param p The center of the eraser rectangle. The size of the rectangle is
     * determined by the `eraserSize` property.
     */
    public erase(p: IPoint) {
        const result = this.internalErase(p);

        if (!this._isUpdating) {
            this.flushChangeLog();
        }
    }

    /**
     * Erases portions of strokes that intersect with the eraser rectangle.
     * @param p The center of the eraser rectangle. The size of the rectangle is
     * determined by the `eraserSize` property.
     */
    public pointErase(p: IPoint) {
        const result = this.internalPointErase(p);

        if (!this._isUpdating) {
            this.flushChangeLog();
        }
    }

    /**
     * Converts screen coordinates to viewport coordinates.
     * @param p The point to convert.
     * @returns The converted point.
     */
    public screenToViewport(p: IPoint): IPoint {
        return screenToViewport(
            p,
            this.referencePoint === "center"
                ? { x: this.centerX, y: this.centerY }
                : { x: 0, y: 0 },
            this.offset,
            this.scale
        );
    }

    /**
     * Converts viewport coordinates to screen coordinates.
     * @param p The point to convert.
     * @returns The converted point.
     */
    public viewportToScreen(p: IPoint): IPoint {
        return viewportToScreen(
            p,
            this.referencePoint === "center"
                ? { x: this.centerX, y: this.centerY }
                : { x: 0, y: 0 },
            this.offset,
            this.scale
        );
    }

    /**
     * Gets the DOM element that hosts the inking surface.
     */
    get hostElement(): HTMLElement {
        return this._hostElement;
    }

    /**
     * Gets the pen brush.
     */
    get penBrush(): IBrush {
        return this._penBrush;
    }

    /**
     * Sets the pen brush.
     */
    set penBrush(value: IBrush) {
        this._penBrush = { ...value };
    }

    /**
     * Gets the line brush.
     */
    get lineBrush(): IBrush {
        return this._lineBrush;
    }

    /**
     * Sets the line brush.
     */
    set lineBrush(value: IBrush) {
        this._lineBrush = { ...value };
    }

    /**
     * Gets the highlighter brush.
     */
    get highlighterBrush(): IBrush {
        return this._highlighterBrush;
    }

    /**
     * Sets the highlighter brush.
     */
    set highlighterBrush(value: IBrush) {
        this._highlighterBrush = { ...value };
    }

    /**
     * Gets the laser pointer brush.
     */
    get laserPointerBrush(): IBrush {
        return this._laserPointerBrush;
    }

    /**
     * Sets the laser pointer brush.
     */
    set laserPointerBrush(value: IBrush) {
        this._laserPointerBrush = { ...value };
    }

    /**
     * Gets the client (screen) width of the inking surface.
     */
    get clientWidth(): number {
        if (!this._clientWidth) {
            this._clientWidth = this._hostElement.clientWidth;
        }

        return this._clientWidth;
    }

    /**
     * Gets the client (screen) height of the inking surface.
     */
    get clientHeight(): number {
        if (!this._clientHeight) {
            this._clientHeight = this._hostElement.clientHeight;
        }

        return this._clientHeight;
    }

    /**
     * Gets the horizontal center of the inking surface.
     */
    get centerX(): number {
        if (!this._centerX) {
            this._centerX = this.clientWidth * 0.5;
        }

        return this._centerX;
    }

    /**
     * Gets the vertical center of the inking surface.
     */
    get centerY(): number {
        if (!this._centerY) {
            this._centerY = this.clientHeight * 0.5;
        }

        return this._centerY;
    }

    /**
     * Gets the input provider object the inking surface receives
     * pointer events from.
     */
    get inputProvider(): InputProvider {
        return this._inputProvider;
    }

    /**
     * Sets the input provider object the inking surface receives
     * pointer events from.
     */
    set inputProvider(value: InputProvider) {
        if (this._inputProvider !== value) {
            let wasActive = false;

            if (this._inputProvider) {
                wasActive = this._inputProvider.isActive;

                this._inputProvider.deactivate();

                this._inputProvider.pointerDown.off(this.onPointerDown);
                this._inputProvider.pointerMove.off(this.onPointerMove);
                this._inputProvider.pointerUp.off(this.onPointerUp);
                this._inputProvider.pointerLeave.off(this.onPointerLeave);
            }

            this._inputProvider = value;

            if (this._inputProvider) {
                this._inputProvider.pointerDown.on(this.onPointerDown);
                this._inputProvider.pointerMove.on(this.onPointerMove);
                this._inputProvider.pointerUp.on(this.onPointerUp);
                this._inputProvider.pointerLeave.on(this.onPointerLeave);

                if (wasActive) {
                    this._inputProvider.activate();
                }
            }
        }
    }

    /**
     * Gets the current tool. Defaults to `InkingTool.Pen`.
     */
    get tool(): InkingTool {
        return this._tool;
    }

    /**
     * Sets the current tool.
     */
    set tool(value: InkingTool) {
        if (this._tool !== value) {
            if (this._currentStroke !== undefined) {
                this._currentStroke.cancel();
            }

            this._tool = value;
        }
    }

    /**
     * Gets the reference point. Defaults to "center".
     */
    get referencePoint(): CanvasReferencePoint {
        return this._referencePoint;
    }

    /**
     * Sets the reference point.
     */
    set referencePoint(value: CanvasReferencePoint) {
        if (this._referencePoint !== value) {
            this._referencePoint = value;

            this._dryCanvas.referencePoint = value;

            this.reRender();
        }
    }

    /**
     * Gets the viewport offset. Defaults to 0,0.
     */
    get offset(): Readonly<IPoint> {
        return this._offset;
    }

    /**
     * Sets the viewport offset.
     */
    set offset(value: IPoint) {
        if (this._offset != value) {
            this._offset = { ...value };

            this.reRender();
        }
    }

    /**
     * Gets the scale. Defaults to 1.
     */
    get scale(): number {
        return this._scale;
    }

    /**
     * Sets the scale. Value must be greatwer than 0.
     */
    set scale(value: number) {
        if (this._scale !== value && value > 0) {
            this._scale = value;

            this.reRender();
        }
    }

    /**
     * Gets inking surface's viewport, according to the current
     * reference point, scale and offset.
     */
    get viewPort(): IRect {
        const topLeft = this.screenToViewport({ x: 0, y: 0 });
        const bottomRight = this.screenToViewport({
            x: this.clientWidth,
            y: this.clientHeight,
        });

        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
        };
    }
}
