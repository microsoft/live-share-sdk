/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { IFluidHandle } from '@fluidframework/core-interfaces';
import { IValueChanged, SharedMap } from '@fluidframework/map';
import { ISequencedDocumentMessage } from '@fluidframework/protocol-definitions';
import { AddPointsEvent, BeginStrokeEvent, ClearEvent, IAddPointsEventArgs, IAddRemoveStrokeOptions, IBeginStrokeEventArgs,
    InkingManager, IWetStroke, StrokeEndState, StrokesAddedEvent, StrokesRemovedEvent } from './InkingManager';
import { IPointerPoint, getDistanceBetweenPoints } from './Geometry';
import { IStroke, Stroke, StrokeType } from "./Stroke";
import { EphemeralEventScope, EphemeralEventTarget, IEphemeralEvent, UserMeetingRole } from '@microsoft/live-share';
import { IBrush } from '../canvas/Brush';

enum StrokeEventNames {
    BeginWetStroke = "BeginWetStroke",
    AddWetStrokePoints = "AddWetStrokePoint",
}

type IBeginWetStrokeEvent = IEphemeralEvent & IBeginStrokeEventArgs;
type IAddWetStrokePointsEvent = IEphemeralEvent & IAddPointsEventArgs;

class LiveStroke {
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

            if (threshold < SharedInkingSession.wetStrokePointSimplificationThreshold) {
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
        readonly brush: IBrush) { }

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
                SharedInkingSession.wetStrokeEventsStreamDelay);
        }
    }
}

/**
 * Enables live and collaborative inking.
 */
export class SharedInkingSession extends DataObject {
    /**
     * Configures the delay before wet stroke events are emitted, to greatly reduce the 
     * number of events emitted and improve performance.
     */
    public static wetStrokeEventsStreamDelay = 60;
    /**
     * In order to limit the number of points being sent over the wire, wet strokes are
     * simplified as follows:
     * - Given 3 points A, B, C
     * - If distance(A, B) + distance(B, C) < wetStrokePointSimplificationThreshold % of distance(A, C)
     * - Then remove point B because it's almost on the same line as that defined by A and C
     * This variable allows the fine tuning of that threshold.
     */
    public static wetStrokePointSimplificationThreshold = 100.2;

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
    private _beginWetStrokeEventTarget!: EphemeralEventTarget<IBeginWetStrokeEvent>;
    private _addWetStrokePointEventTarget!: EphemeralEventTarget<IAddWetStrokePointsEvent>;
    private _allowedRoles: UserMeetingRole[] = [ UserMeetingRole.guest, UserMeetingRole.attendee, UserMeetingRole.organizer, UserMeetingRole.presenter ];    
    private _pendingLiveStrokes: Map<string, LiveStroke> = new Map<string, LiveStroke>();

    private liveStrokeProcessed = (liveStroke: LiveStroke) => {
        this._addWetStrokePointEventTarget.sendEvent(
            {
                name: StrokeEventNames.AddWetStrokePoints,
                strokeId: liveStroke.id,
                points: liveStroke.points,
                endState: liveStroke.endState
            });

        liveStroke.clear();
    }

    private setupWetInkProcessing(): void {
        // Setup outgoing events
        if (this._inkingManager) {
            this._inkingManager.on(
                BeginStrokeEvent,
                (eventArgs: IBeginStrokeEventArgs) => {
                    const liveStroke = new LiveStroke(
                        eventArgs.strokeId,
                        eventArgs.type,
                        eventArgs.brush
                    );

                    liveStroke.points.push(eventArgs.startPoint);

                    this._pendingLiveStrokes.set(liveStroke.id, liveStroke);

                    this._beginWetStrokeEventTarget.sendEvent(
                        {
                            name: StrokeEventNames.BeginWetStroke,
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
        const scope = new EphemeralEventScope(this.runtime, [ UserMeetingRole.presenter ]);

        this._beginWetStrokeEventTarget = new EphemeralEventTarget(
            scope,
            StrokeEventNames.BeginWetStroke,
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
                }      
            });

        this._addWetStrokePointEventTarget = new EphemeralEventTarget(
            scope,
            StrokeEventNames.AddWetStrokePoints,
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
                    }
                }        
            });
    }

    private setupDryInkProcessing(): void {
        if (this._inkingManager) {
            const inkingManager = this._inkingManager;

            // Setup incoming changes
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
                            const strokeJson: string | undefined = this._dryInkMap.get(changed.key);
                            const addRemoveOptions: IAddRemoveStrokeOptions = { forceReRender: true, addToChangeLog: false };

                            if (strokeJson !== undefined) {
                                const stroke = inkingManager.getStroke(changed.key) ?? new Stroke();
                                stroke.deserialize(strokeJson);

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

            // Setup outgoing changes.
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

    protected async initializingFirstTime(): Promise<void> {
        this._dryInkMap = SharedMap.create(this.runtime, 'dryInk');
        this.root.set('dryInk', this._dryInkMap.handle);
    }

    protected async hasInitialized(): Promise<void> {
        const handle = this.root.get<IFluidHandle<SharedMap>>("dryInk");

        if (handle) {
            this._dryInkMap = await handle.get();
        }
        else {
            throw new Error("Unable to get the dryInk SharedMap handle.");
        }
    }

    /**
     * Starts the live inking session.
     * @param hostElement The element to attach the InkingManager to.
     * @returns An InkingManager instance that can be used by the applications
     * to set the tool, brush, add strokes and more.
     */
    synchronize(hostElement: HTMLElement): InkingManager {
        this._inkingManager = new InkingManager(hostElement);

        this.setupDryInkProcessing();
        this.setupWetInkProcessing();

        return this._inkingManager;
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