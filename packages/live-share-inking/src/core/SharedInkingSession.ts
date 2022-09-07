/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { IFluidHandle } from '@fluidframework/core-interfaces';
import { IValueChanged, SharedMap } from '@fluidframework/map';
import { ISequencedDocumentMessage } from '@fluidframework/protocol-definitions';
import {
    AddPointsEvent, BeginStrokeEvent, ClearEvent, IAddPointsEventArgs, IAddRemoveStrokeOptions, IBeginStrokeEventArgs,
    InkingManager, IPointerMovedEventArgs, IWetStroke, PointerMovedEvent, StrokeEndState, StrokesAddedEvent, StrokesRemovedEvent
} from './InkingManager';
import { IPointerPoint, getDistanceBetweenPoints, IPoint } from './Geometry';
import { IStroke, Stroke, StrokeType } from "./Stroke";
import { EphemeralEventScope, EphemeralEventTarget, IEphemeralEvent, UserMeetingRole } from '@microsoft/live-share';
import { IBrush } from './Brush';
import { BasicColors, darkenColor, IColor, toCssColor } from './Colors';

enum InkingEventNames {
    PointerMove = "PointerMove",
    BeginWetStroke = "BeginWetStroke",
    AddWetStrokePoints = "AddWetStrokePoint",
}

/**
 * Encapsulates information about a user.
 */
export interface IUserInfo {
    /**
     * Optional. The user's display name.
     */
    displayName?: string;
    /**
     * Optional. The URI to the user's picture.
     */
    pictureUri?: string;
}

type IPointerMovedEvent = IEphemeralEvent & IPointerMovedEventArgs & IUserInfo;

interface ISharedCursor {
    isCursorShared?: boolean;
}

type IBeginWetStrokeEvent = IEphemeralEvent & IBeginStrokeEventArgs & ISharedCursor & IUserInfo;
type IAddWetStrokePointsEvent = IEphemeralEvent & IAddPointsEventArgs & ISharedCursor & IUserInfo;

class LiveStroke {
    /**
     * Configures the delay before wet stroke events are emitted, to greatly reduce the 
     * number of events emitted and improve performance.
     */
    private static readonly wetStrokeEventsStreamDelay = 60;

    private _points: IPointerPoint[] = [];
    private _processTimeout?: number;

    private process() {
        if (this.type !== StrokeType.Persistent) {
            return;
        }

        const startLength = this._points.length;

        let index = 0;

        while (index + 2 < this._points.length) {
            const p1 = this._points[index];
            const p2 = this._points[index + 1];
            const p3 = this._points[index + 2];

            const p1p2 = getDistanceBetweenPoints(p1, p2);
            const p2p3 = getDistanceBetweenPoints(p2, p3);
            const p1p3 = getDistanceBetweenPoints(p1, p3);

            const threshold = (p1p2 + p2p3) * (100 / p1p3);

            if (threshold < this.simplificationThreshold) {
                this._points.splice(index + 1, 1);
            }
            else {
                index++;
            }
        }
    }

    endState?: StrokeEndState;

    constructor(
        readonly id: string,
        readonly type: StrokeType,
        readonly brush: IBrush,
        readonly simplificationThreshold: number) { }

    get points(): IPointerPoint[] {
        return this._points;
    }

    clear() {
        this._points = [];
    }

    scheduleProcessing(onProcessedCallback: (stroke: LiveStroke) => void) {
        if (this._processTimeout === undefined) {
            this._processTimeout = window.setTimeout(
                () => {
                    this.process();

                    this._processTimeout = undefined;

                    onProcessedCallback(this);
                },
                LiveStroke.wetStrokeEventsStreamDelay);
        }
    }
}

/**
 * Represents a cursor's visual representation. Applications that want
 * to customize the appearance of cursors on the screen should extend
 * `CursorVisual` and override its `renderedElement` property to return
 * a custom HTML element.
 */
export abstract class CursorVisual {
    private _renderedElement?: HTMLElement;

    protected abstract internalRender(): HTMLElement;

    /**
     * Initializes a new instance of `CursorVisual`.
     * @param info The cursor info.
     */
    constructor(public readonly clientId: string, public readonly userInfo?: IUserInfo) { }

    /**
     * Updates the position of the cursor.
     * @param position The new position of the cursor.
     */
    setPosition(position: IPoint) {
        if (this.renderedElement) {
            this.renderedElement.style.left = position.x + "px";
            this.renderedElement.style.top = position.y + "px";
        }
    }

    /**
     * Returns an HTML element representing the cursor. Applications
     * that extend `CursorVisual` must override `get renderedElement`
     * to return a custom built HTML element.
     */
    get renderedElement(): HTMLElement {
        if (!this._renderedElement) {
            this._renderedElement = this.internalRender();
        }

        return this._renderedElement;
    }
}

interface ICursorColor {
    readonly backgroundColor: IColor,
    foregroundColor: IColor
}

class BuiltInCursorVisual extends CursorVisual {
    private static cursorColors: ICursorColor[] = [
        { backgroundColor: BasicColors.red, foregroundColor: BasicColors.white },
        { backgroundColor: BasicColors.green, foregroundColor: BasicColors.black },
        { backgroundColor: BasicColors.blue, foregroundColor: BasicColors.black },
        { backgroundColor: BasicColors.purple, foregroundColor: BasicColors.black },
        { backgroundColor: BasicColors.magenta, foregroundColor: BasicColors.black },
        { backgroundColor: BasicColors.violet, foregroundColor: BasicColors.black },
        { backgroundColor: BasicColors.gray, foregroundColor: BasicColors.black },
        { backgroundColor: BasicColors.silver, foregroundColor: BasicColors.black }
    ];
    private static currentColorIndex = 0;

    private _color: ICursorColor;

    protected internalRender(): HTMLElement {
        const cursorSize = 20;

        const foregroundColor = toCssColor(this._color.foregroundColor);
        const backgroundColor = toCssColor(this._color.backgroundColor);
        const borderColor = toCssColor(darkenColor(this._color.backgroundColor, 50));

        let visualTemplate = `
            <svg width="${cursorSize}" height="${cursorSize}">
                <path d="M0 0 L${cursorSize} ${cursorSize / 2.2} L${cursorSize / 2} ${cursorSize / 2} L8 ${cursorSize} Z" stroke-width="1" stroke="${borderColor}" fill="${backgroundColor}"/>
            </svg>`;

        if (this.userInfo) {
            if (this.userInfo.displayName) {
                visualTemplate += `
                    <div style="background-color: ${backgroundColor}; color: ${foregroundColor}; border: 1px solid ${borderColor};
                    border-radius: ${cursorSize * 1.1 / 2}px / 50%; padding: 2px 6px; margin: ${cursorSize * 0.75}px 0 0 -${cursorSize * 0.25}px; white-space: nowrap; font-size: 12px; font-family: sans-serif">
                        ${this.userInfo.displayName}
                    </div>`;
            }
            else if (this.userInfo.pictureUri && !this.userInfo.displayName) {
                visualTemplate += `
                    <img src="${this.userInfo.pictureUri}" style="width: ${cursorSize * 1.1}px; height: ${cursorSize * 1.1}px; border-radius: 50%;
                        border: 1px solid ${borderColor}; margin: ${cursorSize * 0.75}px 0 0 -${cursorSize * 0.25}px;">`;
            }
            else if (this.userInfo.pictureUri && this.userInfo.displayName) {
                visualTemplate += `
                    <div style="display: flex; flex-direction: row; align-items: center; background-color: ${backgroundColor}; color: ${foregroundColor}; border: 1px solid ${borderColor};
                        border-radius: ${cursorSize * 1.1 / 2}px / 50%; margin: ${cursorSize * 0.75}px 0 0 -${cursorSize * 0.25}px; white-space: nowrap; font-size: 12px; font-family: sans-serif">
                        <img src="${this.userInfo.pictureUri}" style="width: ${cursorSize * 1.1}px; height: ${cursorSize * 1.1}px; border-radius: 50%;">
                        <div style="padding: 0 8px">${this.userInfo.displayName}</div>
                    </div>`;
            }
        }

        const template = document.createElement("template");
        template.innerHTML = visualTemplate;

        const element = document.createElement("div");
        element.style.position = "absolute";
        element.style.display = "flex";
        element.style.flexDirection = "row";

        element.appendChild(template.content.cloneNode(true));

        return element;
    }

    constructor(public clientId: string, public readonly userInfo?: IUserInfo) {
        super(clientId, userInfo);

        this._color = BuiltInCursorVisual.cursorColors[BuiltInCursorVisual.currentColorIndex];

        BuiltInCursorVisual.currentColorIndex++;

        if (BuiltInCursorVisual.currentColorIndex >= BuiltInCursorVisual.cursorColors.length) {
            BuiltInCursorVisual.currentColorIndex = 0;
        }
    }
}

/**
 * Enables live and collaborative inking.
 */
export class SharedInkingSession extends DataObject {
    private static readonly dryInkMapKey = "dryInk";

    /**
     * In order to limit the number of points being sent over the wire, wet strokes are
     * simplified as follows:
     * - Given 3 points A, B, C
     * - If distance(A, B) + distance(B, C) < wetStrokePointSimplificationThreshold % of distance(A, C)
     * - Then remove point B because it's almost on the same line as that defined by A and C
     * This variable allows the fine tuning of that threshold.
     */
    private static readonly wetStrokePointSimplificationThreshold = 100.05;

    /**
    * The object's Fluid type/name.
    */
    public static readonly TypeName = `@microsoft/shared-inking-session`;

    /**
     * The object's Fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        SharedInkingSession.TypeName,
        SharedInkingSession,
        [],
        {}
    );

    private _inkingManager?: InkingManager;
    private _processingIncomingChanges = false;
    private _dryInkMap!: SharedMap;
    private _wetStrokes: Map<string, IWetStroke> = new Map<string, IWetStroke>();
    private _pointerMovedEventTarget!: EphemeralEventTarget<IPointerMovedEvent>;
    private _beginWetStrokeEventTarget!: EphemeralEventTarget<IBeginWetStrokeEvent>;
    private _addWetStrokePointEventTarget!: EphemeralEventTarget<IAddWetStrokePointsEvent>;
    private _allowedRoles: UserMeetingRole[] = [UserMeetingRole.guest, UserMeetingRole.attendee, UserMeetingRole.organizer, UserMeetingRole.presenter];
    private _pendingLiveStrokes: Map<string, LiveStroke> = new Map<string, LiveStroke>();
    private _cursorVisualsMap = new Map<string, CursorVisual>();
    private _cursorVisualsHost!: HTMLElement;
    private _isCursorShared: boolean = false;

    private liveStrokeProcessed = (liveStroke: LiveStroke) => {
        const userInfo = this.getLocalUserInfo();

        this._addWetStrokePointEventTarget.sendEvent(
            {
                name: InkingEventNames.AddWetStrokePoints,
                isCursorShared: this.isCursorShared ? true : undefined,
                displayName: userInfo?.displayName,
                strokeId: liveStroke.id,
                points: liveStroke.points,
                endState: liveStroke.endState
            });

        liveStroke.clear();
    }

    private getLocalUserInfo(): IUserInfo | undefined {
        return this.onGetLocalUserInfo ? this.onGetLocalUserInfo() : undefined;
    }

    private setupWetInkProcessing(): void {
        // Setup outgoing events
        if (this._inkingManager) {
            this._inkingManager.on(
                PointerMovedEvent,
                (eventArgs: IPointerMovedEventArgs) => {
                    if (this.isCursorShared) {
                        const userInfo = this.getLocalUserInfo();

                        this._pointerMovedEventTarget.sendEvent(
                            {
                                position: eventArgs.position,
                                displayName: userInfo?.displayName,
                                pictureUri: userInfo?.pictureUri
                            });
                    }
                });
            this._inkingManager.on(
                BeginStrokeEvent,
                (eventArgs: IBeginStrokeEventArgs) => {
                    const liveStroke = new LiveStroke(
                        eventArgs.strokeId,
                        eventArgs.type,
                        eventArgs.brush,
                        SharedInkingSession.wetStrokePointSimplificationThreshold
                    );

                    liveStroke.points.push(eventArgs.startPoint);

                    this._pendingLiveStrokes.set(liveStroke.id, liveStroke);

                    const userInfo = this.getLocalUserInfo();

                    this._beginWetStrokeEventTarget.sendEvent(
                        {
                            name: InkingEventNames.BeginWetStroke,
                            isCursorShared: this.isCursorShared ? true : undefined,
                            displayName: userInfo?.displayName,
                            pictureUri: userInfo?.pictureUri,
                            ...eventArgs
                        });
                });
            this._inkingManager.on(
                AddPointsEvent,
                (eventArgs: IAddPointsEventArgs) => {
                    const liveStroke = this._pendingLiveStrokes.get(eventArgs.strokeId);

                    if (liveStroke !== undefined) {
                        if (!eventArgs.endState && eventArgs.points.length > 0) {
                            liveStroke.points.push(...eventArgs.points);
                        }

                        liveStroke.endState = eventArgs.endState;

                        if (eventArgs.endState) {
                            this._pendingLiveStrokes.delete(eventArgs.strokeId);
                        }

                        if (eventArgs.points.length > 0) {
                            liveStroke.scheduleProcessing(this.liveStrokeProcessed);
                        }
                    }
                });
        }

        // Setup incoming events
        const scope = new EphemeralEventScope(this.runtime, [UserMeetingRole.presenter]);

        this._pointerMovedEventTarget = new EphemeralEventTarget(
            scope,
            InkingEventNames.PointerMove,
            (evt: IPointerMovedEvent, local: boolean) => {
                if (!local && evt.clientId) {
                    this.updateCursorPosition(
                        evt.clientId,
                        {
                            displayName: evt.displayName,
                            pictureUri: evt.pictureUri
                        },
                        evt.position);
                }
            });

        this._beginWetStrokeEventTarget = new EphemeralEventTarget(
            scope,
            InkingEventNames.BeginWetStroke,
            (evt: IBeginWetStrokeEvent, local: boolean) => {
                if (!local && this._inkingManager) {
                    const stroke = this._inkingManager.beginWetStroke(
                        evt.type,
                        evt.startPoint,
                        {
                            id: evt.strokeId,
                            clientId: evt.clientId,
                            timeStamp: evt.timestamp,
                            brush: evt.brush
                        });

                    this._wetStrokes.set(evt.strokeId, stroke);

                    if (evt.clientId) {
                        if (evt.type !== StrokeType.Persistent || !evt.isCursorShared) {
                            this.removeCursor(evt.clientId);
                        }
                        else {
                            this.updateCursorPosition(
                                evt.clientId,
                                {
                                    displayName: evt.displayName,
                                    pictureUri: evt.pictureUri
                                },
                                evt.startPoint);
                        }
                    }
                }
            });

        this._addWetStrokePointEventTarget = new EphemeralEventTarget(
            scope,
            InkingEventNames.AddWetStrokePoints,
            (evt: IAddWetStrokePointsEvent, local: boolean) => {
                if (!local) {
                    const stroke = this._wetStrokes.get(evt.strokeId);

                    if (stroke) {
                        stroke.addPoints(...evt.points);

                        // Unless the wet stroke is ephemeral or has been cancelled, leave it
                        // on the screen until it has been synchronized and we receive
                        // a valueChanged event. Removing it now would potentially lead to the
                        // stroke fully disappearing for a brief period of time before begin
                        // re-rendered in full fidelity.
                        if (evt.endState === StrokeEndState.Cancelled) {
                            stroke.cancel();
                        }
                        else if (evt.endState === StrokeEndState.Ended && stroke.type === StrokeType.Ephemeral) {
                            stroke.end();
                        }

                        if (evt.clientId) {
                            if (stroke.type !== StrokeType.Persistent || evt.endState || !evt.isCursorShared) {
                                this.removeCursor(evt.clientId);
                            }
                            else {
                                this.updateCursorPosition(
                                    evt.clientId,
                                    {
                                        displayName: evt.displayName,
                                        pictureUri: evt.pictureUri
                                    },
                                    evt.points[evt.points.length - 1]);
                            }
                        }
                    }
                }
            });
    }

    private setupStorageProcessing(): void {
        if (this._inkingManager) {
            const inkingManager = this._inkingManager;

            // Setup incoming dry ink changes
            this._dryInkMap.forEach(
                (value: string) => {
                    const stroke = new Stroke();
                    stroke.deserialize(value);

                    inkingManager.addStroke(stroke);
                });

            this._dryInkMap.on(
                "valueChanged",
                (changed: IValueChanged, local: boolean): void => {
                    this._processingIncomingChanges = true;

                    try {
                        if (!local) {
                            const serializedStroke: string | undefined = this._dryInkMap.get(changed.key);
                            const addRemoveOptions: IAddRemoveStrokeOptions = { forceReRender: true, addToChangeLog: false };

                            if (serializedStroke !== undefined) {
                                const stroke = inkingManager.getStroke(changed.key) ?? new Stroke();
                                stroke.deserialize(serializedStroke);

                                // If we received a stroke that happens to be an ongoing wet stroke,
                                // cancel the wet stroke so it's removed from the screen and replace
                                // it with the full fidelity version we just received.
                                const wetStroke = this._wetStrokes.get(stroke.id);

                                if (wetStroke) {
                                    wetStroke.cancel();

                                    this._wetStrokes.delete(wetStroke.id);
                                }

                                inkingManager.addStroke(stroke, addRemoveOptions);
                            }
                            else {
                                inkingManager.removeStroke(changed.key, addRemoveOptions);
                            }
                        }
                    }
                    finally {
                        this._processingIncomingChanges = false;
                    }
                });

            this._dryInkMap.on(
                "op",
                (op: ISequencedDocumentMessage, local: boolean): void => {
                    this._processingIncomingChanges = true;

                    try {
                        if (!local) {
                            if (op.contents.type === "clear") {
                                inkingManager.clear();
                            }
                        }
                    }
                    finally {
                        this._processingIncomingChanges = false;
                    }
                });

            // Setup outgoing dry ink changes.
            inkingManager.on(
                StrokesAddedEvent,
                (strokes: IStroke[]): void => {
                    if (!this._processingIncomingChanges) {
                        for (let stroke of strokes) {
                            this._dryInkMap.set(stroke.id, stroke.serialize());
                        }
                    }
                });
            inkingManager.on(
                StrokesRemovedEvent,
                (ids: string[]): void => {
                    if (!this._processingIncomingChanges) {
                        for (let id of ids) {
                            this._dryInkMap.delete(id);
                        }
                    }
                });
            inkingManager.on(
                ClearEvent,
                (): void => {
                    if (!this._processingIncomingChanges) {
                        this._dryInkMap.clear();
                    }
                });
        }
    }

    private getCursor(clientId: string, userInfo?: IUserInfo): CursorVisual {
        let cursorVisual = this._cursorVisualsMap.get(clientId);

        if (!cursorVisual) {
            cursorVisual = this.onCreateCursorVisual
                ? this.onCreateCursorVisual(clientId, userInfo)
                : new BuiltInCursorVisual(clientId, userInfo);

            this._cursorVisualsMap.set(clientId, cursorVisual);
        }

        if (!this._cursorVisualsHost.contains(cursorVisual.renderedElement)) {
            this._cursorVisualsHost.appendChild(cursorVisual.renderedElement);
        }

        return cursorVisual;
    }

    private removeCursor(clientId: string) {
        const cursorVisual = this._cursorVisualsMap.get(clientId);

        if (cursorVisual) {
            if (this._cursorVisualsHost.contains(cursorVisual.renderedElement)) {
                this._cursorVisualsHost.removeChild(cursorVisual.renderedElement);
            }
        }

        // We do not remove the cursor component from the cursor map so that
        // we don't lose the color it got automatically attributed.
    }

    private updateCursorPosition(clientId: string, userInfo?: IUserInfo, position?: IPoint) {
        if (this._inkingManager) {
            if (position) {
                const cursorVisual = this.getCursor(clientId, userInfo);

                const screenPosition = this._inkingManager.viewportToScreen(position);

                cursorVisual.setPosition(screenPosition);
            }
            else {
                this.removeCursor(clientId);
            }
        }
    }

    protected async initializingFirstTime(): Promise<void> {
        this._dryInkMap = SharedMap.create(this.runtime, SharedInkingSession.dryInkMapKey);

        this.root.set(SharedInkingSession.dryInkMapKey, this._dryInkMap.handle);
    }

    protected async hasInitialized(): Promise<void> {
        const handle = this.root.get<IFluidHandle<SharedMap>>(SharedInkingSession.dryInkMapKey);

        if (handle) {
            this._dryInkMap = await handle.get();
        }
        else {
            throw new Error(`Unable to get SharedMap with key "${SharedInkingSession.dryInkMapKey}"`);
        }
    }

    /**
     * Optional callback that allows the consuming application to provide a
     * friendly display name and/or a picture that will be used on remote devices
     * to render shared cursors.
     */
    onGetLocalUserInfo?: () => IUserInfo | undefined;

    /**
     * Optional callback that allows the consuming application to provide its own
     * cursor visual implementation by extending the abstract `CursorVisual` class.
     * The callback is passed the cursor info retrieved via the `onGetCursorInfo`
     * calback, if provided.
     */
    onCreateCursorVisual?: (clientId: string, userInfo?: IUserInfo) => CursorVisual;

    /**
     * Starts the live inking session.
     * @param hostElement The element to attach the InkingManager to.
     * @returns An InkingManager instance that can be used by the applications
     * to set the tool, brush, add strokes and more.
     */
    synchronize(hostElement: HTMLElement): InkingManager {
        this._inkingManager = new InkingManager(hostElement);

        this.setupStorageProcessing();
        this.setupWetInkProcessing();

        this._cursorVisualsHost = document.createElement("div");
        this._cursorVisualsHost.style.position = "absolute";
        this._cursorVisualsHost.style.pointerEvents = "none";
        this._cursorVisualsHost.style.width = "100%";
        this._cursorVisualsHost.style.height = "100%";
        this._cursorVisualsHost.style.overflow = "hidden";

        hostElement.appendChild(this._cursorVisualsHost);

        return this._inkingManager;
    }

    /**
     * Gets the current cursor sharing status of this client.
     */
    get isCursorShared(): boolean {
        return this._isCursorShared;
    }

    /**
     * Sets the current cursor sharing status of this client.
     */
    set isCursorShared(value: boolean) {
        if (this._isCursorShared !== value) {
            this._isCursorShared = value;

            if (!this._isCursorShared) {
                // Send a pointer moved event with an undefined
                // point to indicated the cursor is not shared anymore
                this._pointerMovedEventTarget.sendEvent({});
            }
        }
    }

    /**
     * Gets the list of roles that are allowed to emit wet stroke events.
     */
    get allowedRoles(): UserMeetingRole[] {
        return this._allowedRoles;
    }

    /**
     * Sets the list of roles that are allowed to emit wet stroke events.
     */
    set allowedRoles(value: UserMeetingRole[]) {
        this._allowedRoles = value;

        this.setupWetInkProcessing();
    }
}