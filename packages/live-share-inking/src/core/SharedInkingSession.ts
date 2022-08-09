/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

 import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { IFluidHandle } from '@fluidframework/core-interfaces';
import { IValueChanged, SharedMap } from '@fluidframework/map';
import { ISequencedDocumentMessage } from '@fluidframework/protocol-definitions';
import { AddPointEvent, BeginStrokeEvent, ClearEvent, IAddPointsEventArgs, IBeginStrokeEventArgs,
    InkingManager, IWetStroke, StrokesAddedEvent, StrokesRemovedEvent } from './InkingManager';
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

            if (getDistanceBetweenPoints(p1, p2) + getDistanceBetweenPoints(p2, p3) - getDistanceBetweenPoints(p1, p3) < SharedInkingSession.wetStrokePointSimplificationThreshold) {
                this._points.splice(index + 1, 1);
            }
            else {
                index++; 
            }
        }
    }

    hasEnded: boolean = false;

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

export class SharedInkingSession extends DataObject {
    public static wetStrokeEventsStreamDelay = 60;
    public static wetStrokePointSimplificationThreshold = 0.08;

    public static readonly TypeName = `@microsoft/shared-inking-session`;
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

    private _pendingLiveStrokes: Map<string, LiveStroke> = new Map<string, LiveStroke>();

    private liveStrokeProcessed = (liveStroke: LiveStroke) => {
        this._addWetStrokePointEventTarget.sendEvent(
            {
                name: StrokeEventNames.AddWetStrokePoints,
                strokeId: liveStroke.id,
                points: liveStroke.points,
                hasEnded: liveStroke.hasEnded
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
                AddPointEvent,
                (eventArgs: IAddPointsEventArgs) => {
                    const liveStroke = this._pendingLiveStrokes.get(eventArgs.strokeId);

                    if (liveStroke !== undefined) {
                        if (!eventArgs.hasEnded) {
                            liveStroke.points.push(...eventArgs.points);
                        }
                        liveStroke.hasEnded = eventArgs.hasEnded;

                        if (eventArgs.hasEnded) {
                            this._pendingLiveStrokes.delete(eventArgs.strokeId);
                        }

                        liveStroke.scheduleProcessing(this.liveStrokeProcessed);
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

                        if (evt.hasEnded) {
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

                            if (strokeJson !== undefined) {
                                const stroke = inkingManager.getStroke(changed.key) ?? new Stroke();
                                stroke.deserialize(strokeJson);

                                inkingManager.addStroke(stroke);
                            }
                            else {
                                inkingManager.removeStroke(changed.key);
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

    synchronize(hostElement: HTMLElement): InkingManager {
        this._inkingManager = new InkingManager(hostElement);

        this.setupDryInkProcessing();
        this.setupWetInkProcessing();

        return this._inkingManager;
    }

    get allowedRoles(): UserMeetingRole[] {
        return this._allowedRoles;
    }

    set allowedRoles(value: UserMeetingRole[]) {
        this._allowedRoles = value;

        this.setupWetInkProcessing();
    }
}