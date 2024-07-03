/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    DataObjectFactory,
    createDataObjectKind,
} from "@fluidframework/aqueduct/internal";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { SharedMap } from "@fluidframework/map/internal";
import { InkingManager } from "./InkingManager";
import { IPoint } from "./Geometry";
import { IStroke, StrokeType } from "./Stroke";
import {
    UserMeetingRole,
    LiveTelemetryLogger,
    ILiveEvent,
    LiveDataObjectInitializeState,
    ExpectedError,
    UnexpectedError,
} from "@microsoft/live-share";
import {
    LiveEventScope,
    LiveEventTarget,
    DynamicObjectRegistry,
    LiveDataObject,
} from "@microsoft/live-share/internal";
import {
    BuiltInLiveCursor,
    IAddWetStrokePointsEvent,
    IBeginWetStrokeEvent,
    IPointerMovedEvent,
    InkingEventNames,
    LivePointerInputProvider,
    LiveStroke,
    TelemetryEvents,
    LiveCanvasStorageSolution,
    SharedTreeStorageSolution,
    SharedMapStorageSolution,
    StorageSolutionEvents,
    createUndoRedoStacks,
    undoRedo,
} from "./internals";
import { ITree, SharedObjectKind, SharedTree, TreeView } from "fluid-framework";
import {
    IAddPointsEventArgs,
    IAddRemoveStrokeOptions,
    IBeginStrokeEventArgs,
    IPointerMovedEventArgs,
    IWetStroke,
} from "./InkingManager-interfaces";
import {
    AddPointsEvent,
    BeginStrokeEvent,
    ClearEvent,
    PointerMovedEvent,
    StrokeEndState,
    StrokesAddedEvent,
    StrokesRemovedEvent,
} from "./InkingManager-constants";
import { IEventUserInfo, IUserInfo } from "./LiveCanvas-interfaces";
import { LiveCursor } from "./LiveCursor";
import type { ISharedObjectKind } from "@fluidframework/shared-object-base/internal";
import {
    LiveCanvasStrokesMap,
    LiveCanvasTreeNode,
    treeViewConfiguration,
} from "./LiveCanvasTreeSchema";

/**
 * Enables live and collaborative inking.
 */
export class LiveCanvasClass extends LiveDataObject {
    private _logger?: LiveTelemetryLogger;
    private static readonly dryInkMapKey = "dryInk";
    private static readonly treeKey = "treeKey";

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
     * Configures the frequency at which inactive live cursors are removed from the screen.
     */
    private static readonly liveCursorSweepFrequency = 1000;

    /**
     * Configures how long an inactive live cursor will remain on the screen before being hidden.
     */
    private static readonly liveCursorIdleLifetime = 5000;

    /**
     * The object's Fluid type/name.
     */
    public static readonly TypeName = `@microsoft/shared-inking-session`;

    /**
     * The object's Fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveCanvasClass.TypeName,
        LiveCanvasClass,
        [
            (
                SharedTree as unknown as ISharedObjectKind<ITree> &
                    SharedObjectKind<ITree>
            ).getFactory(),
        ],
        {}
    );

    private _inkingManager?: InkingManager;
    private _processingIncomingChanges = false;
    private _dryInkMap!: SharedMap;
    private _tree?: ITree;
    private _treeView?: TreeView<typeof LiveCanvasTreeNode>;
    private _treeUndoRedo?: undoRedo;
    private _storageSolution?: LiveCanvasStorageSolution;
    private _wetStrokes: Map<string, IWetStroke> = new Map<
        string,
        IWetStroke
    >();
    private _pointerMovedEventTarget!: LiveEventTarget<IPointerMovedEvent>;
    private _beginWetStrokeEventTarget!: LiveEventTarget<IBeginWetStrokeEvent>;
    private _addWetStrokePointEventTarget!: LiveEventTarget<IAddWetStrokePointsEvent>;
    private _pendingLiveStrokes: Map<string, LiveStroke> = new Map<
        string,
        LiveStroke
    >();
    private _liveCursorsMap = new Map<string, LiveCursor>();
    private _liveCursorsHost?: HTMLElement;
    private _isCursorShared: boolean = false;
    private _liveCursorSweepTimeout?: number;
    private _storageListeners: Map<string, Function> = new Map();
    private _inkingManagerListeners: Map<string, Function> = new Map();

    private liveStrokeProcessed = (liveStroke: LiveStroke) => {
        this.onLocalUserAllowed(async () => {
            try {
                await this._addWetStrokePointEventTarget.sendEvent({
                    isCursorShared: this.isCursorShared ? true : undefined,
                    strokeId: liveStroke.id,
                    points: liveStroke.points,
                    endState: liveStroke.endState,
                });
            } catch (err) {
                this._logger?.sendErrorEvent(
                    TelemetryEvents.LiveCanvas.AddWetStrokeEventError,
                    err
                );
            }
            liveStroke.clear();
        });
    };

    private getLocalUserPictureUrl(): string | undefined {
        return this.onGetLocalUserPictureUrl
            ? this.onGetLocalUserPictureUrl()
            : undefined;
    }

    private setupWetInkProcessing(): void {
        // Setup outgoing events
        if (!this._inkingManager) return;
        const pointerEventListener = (eventArgs: IPointerMovedEventArgs) => {
            if (this.isCursorShared) {
                this.onLocalUserAllowed(async () => {
                    try {
                        // Send a pointer moved event with an undefined
                        // point to indicated the cursor is not shared anymore
                        this._pointerMovedEventTarget.sendEvent({
                            position: eventArgs.position,
                            pictureUri: this.getLocalUserPictureUrl(),
                        });
                    } catch (err) {
                        this._logger?.sendErrorEvent(
                            TelemetryEvents.LiveCanvas.PointerMovedEventError,
                            err
                        );
                    }
                });
            }
        };
        this._inkingManager.on(PointerMovedEvent, pointerEventListener);
        this._inkingManagerListeners.set(
            PointerMovedEvent,
            pointerEventListener
        );
        const beginStrokeListener = (eventArgs: IBeginStrokeEventArgs) => {
            const liveStroke = new LiveStroke(
                eventArgs.strokeId,
                eventArgs.type,
                eventArgs.brush,
                LiveCanvas.wetStrokePointSimplificationThreshold
            );

            liveStroke.points.push(eventArgs.startPoint);

            this._pendingLiveStrokes.set(liveStroke.id, liveStroke);

            this.onLocalUserAllowed(async () => {
                // Send the begin wet stroke event
                try {
                    this._beginWetStrokeEventTarget.sendEvent({
                        isCursorShared: this.isCursorShared ? true : undefined,
                        pictureUri: this.getLocalUserPictureUrl(),
                        ...eventArgs,
                    });
                } catch (err) {
                    this._logger?.sendErrorEvent(
                        TelemetryEvents.LiveCanvas.BeginWetStrokeError,
                        err
                    );
                }
            });
        };
        this._inkingManager.on(BeginStrokeEvent, beginStrokeListener);
        this._inkingManagerListeners.set(BeginStrokeEvent, beginStrokeListener);
        const addPointListener = (eventArgs: IAddPointsEventArgs) => {
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
        };
        this._inkingManager.on(AddPointsEvent, addPointListener);
        this._inkingManagerListeners.set(AddPointsEvent, addPointListener);

        if (this._pointerMovedEventTarget) return;

        // Setup incoming events
        const scope = new LiveEventScope(
            this.runtime,
            this.liveRuntime,
            this.allowedRoles
        );

        this._pointerMovedEventTarget = new LiveEventTarget(
            scope,
            InkingEventNames.pointerMove,
            (evt: ILiveEvent<IPointerMovedEvent>, local: boolean) => {
                if (!local && evt.clientId) {
                    this.updateCursorPosition(
                        evt.clientId,
                        {
                            pictureUri: evt.data.pictureUri,
                        },
                        evt.data.position
                    );
                }
            }
        );

        this._beginWetStrokeEventTarget = new LiveEventTarget(
            scope,
            InkingEventNames.beginWetStroke,
            (evt: ILiveEvent<IBeginWetStrokeEvent>, local: boolean) => {
                if (!local && this._inkingManager) {
                    const stroke = this._inkingManager.beginWetStroke(
                        evt.data.type,
                        evt.data.mode,
                        evt.data.startPoint,
                        {
                            id: evt.data.strokeId,
                            clientId: evt.clientId,
                            timeStamp: evt.timestamp,
                            brush: evt.data.brush,
                            version: 1,
                        }
                    );

                    this._wetStrokes.set(evt.data.strokeId, stroke);

                    if (evt.clientId) {
                        if (
                            evt.data.type !== StrokeType.persistent ||
                            !evt.data.isCursorShared
                        ) {
                            this.removeCursor(evt.clientId);
                        } else {
                            this.updateCursorPosition(
                                evt.clientId,
                                {
                                    pictureUri: evt.data.pictureUri,
                                },
                                evt.data.startPoint
                            );
                        }
                    }
                }
            }
        );

        this._addWetStrokePointEventTarget = new LiveEventTarget(
            scope,
            InkingEventNames.addWetStrokePoints,
            (evt: ILiveEvent<IAddWetStrokePointsEvent>, local: boolean) => {
                if (!local) {
                    const stroke = this._wetStrokes.get(evt.data.strokeId);

                    if (stroke) {
                        stroke.addPoints(...evt.data.points);

                        // Unless the wet stroke is ephemeral or has been cancelled, leave it
                        // on the screen until it has been synchronized and we receive
                        // a valueChanged event. Removing it now would potentially lead to the
                        // stroke fully disappearing for a brief period of time before begin
                        // re-rendered in full fidelity.
                        if (evt.data.endState === StrokeEndState.cancelled) {
                            stroke.cancel();
                        } else if (
                            evt.data.endState === StrokeEndState.ended &&
                            stroke.type === StrokeType.ephemeral
                        ) {
                            stroke.end();
                        }

                        if (evt.clientId) {
                            if (
                                stroke.type !== StrokeType.persistent ||
                                evt.data.endState ||
                                !evt.data.isCursorShared
                            ) {
                                this.removeCursor(evt.clientId);
                            } else {
                                this.updateCursorPosition(
                                    evt.clientId,
                                    {
                                        pictureUri: evt.data.pictureUri,
                                    },
                                    evt.data.points[evt.data.points.length - 1]
                                );
                            }
                        }
                    }
                }
            }
        );
    }

    private setupStorageProcessing(node?: LiveCanvasTreeNode): void {
        if (this._inkingManager) {
            const inkingManager = this._inkingManager;
            const treeNode = node ?? this._treeView?.root;
            if (treeNode) {
                this._storageSolution = new SharedTreeStorageSolution(
                    treeNode,
                    inkingManager
                );
            } else {
                this._storageSolution = new SharedMapStorageSolution(
                    this._dryInkMap,
                    inkingManager
                );
            }

            // Setup incoming dry ink changes
            this._storageSolution.forEach((stroke: IStroke) => {
                inkingManager.addStroke(stroke);
            });

            const onStrokeRemovedListener = (
                strokeId: string,
                local: boolean
            ) => {
                if (local) return;
                this._processingIncomingChanges = true;
                try {
                    const addRemoveOptions: IAddRemoveStrokeOptions = {
                        forceReRender: true,
                        addToChangeLog: false,
                    };
                    inkingManager.removeStroke(strokeId, addRemoveOptions);
                } finally {
                    this._processingIncomingChanges = false;
                }
            };
            this._storageSolution.on(
                StorageSolutionEvents.strokeRemoved,
                onStrokeRemovedListener
            );
            this._storageListeners.set(
                StorageSolutionEvents.strokeRemoved,
                onStrokeRemovedListener
            );

            const onStrokeChangedListener = (
                stroke: IStroke,
                local: boolean
            ): void => {
                if (local) return;
                this._processingIncomingChanges = true;

                try {
                    const addRemoveOptions: IAddRemoveStrokeOptions = {
                        forceReRender: true,
                        addToChangeLog: false,
                    };
                    // If we received a stroke that happens to be an ongoing wet stroke,
                    // cancel the wet stroke so it's removed from the screen and replace
                    // it with the full fidelity version we just received.
                    const wetStroke = this._wetStrokes.get(stroke.id);

                    if (wetStroke) {
                        wetStroke.cancel();

                        this._wetStrokes.delete(wetStroke.id);
                    }

                    inkingManager.addStroke(stroke, addRemoveOptions);
                } finally {
                    this._processingIncomingChanges = false;
                }
            };
            this._storageSolution.on(
                StorageSolutionEvents.strokeChanged,
                onStrokeChangedListener
            );
            this._storageListeners.set(
                StorageSolutionEvents.strokeChanged,
                onStrokeChangedListener
            );

            const onStrokesClearedListener = (local: boolean): void => {
                if (local) return;
                this._processingIncomingChanges = true;

                try {
                    inkingManager.clear();
                } finally {
                    this._processingIncomingChanges = false;
                }
            };
            this._storageSolution.on(
                StorageSolutionEvents.strokesCleared,
                onStrokesClearedListener
            );
            this._storageListeners.set(
                StorageSolutionEvents.strokesCleared,
                onStrokesClearedListener
            );

            // Setup outgoing dry ink changes.
            const onStrokesAddedListener = (strokes: IStroke[]): void => {
                if (!this._processingIncomingChanges) {
                    for (let stroke of strokes) {
                        this._storageSolution?.set(stroke);
                    }
                }
            };
            inkingManager.on(StrokesAddedEvent, onStrokesAddedListener);
            this._inkingManagerListeners.set(
                StrokesAddedEvent,
                onStrokesAddedListener
            );
            const onStrokesRemovedEventListener = (ids: string[]): void => {
                if (!this._processingIncomingChanges) {
                    for (let id of ids) {
                        this._storageSolution?.delete(id);
                    }
                }
            };
            inkingManager.on(
                StrokesRemovedEvent,
                onStrokesRemovedEventListener
            );
            this._inkingManagerListeners.set(
                StrokesRemovedEvent,
                onStrokesRemovedEventListener
            );
            const onClearEventListener = (): void => {
                if (!this._processingIncomingChanges) {
                    this._storageSolution?.clear();
                }
            };
            inkingManager.on(ClearEvent, onClearEventListener);
            this._inkingManagerListeners.set(ClearEvent, onClearEventListener);
        }
    }

    private sweepLiveCursors() {
        const cursorsToSweep: string[] = [];

        this._liveCursorsMap.forEach((liveCursor: LiveCursor) => {
            if (liveCursor.idleTime > LiveCanvas.liveCursorIdleLifetime) {
                cursorsToSweep.push(liveCursor.clientId);
            }
        });

        for (let cursorId of cursorsToSweep) {
            this.removeCursor(cursorId);
        }
    }

    private scheduleLiveCursorSweep() {
        if (this._liveCursorSweepTimeout === undefined) {
            this._liveCursorSweepTimeout = window.setTimeout(() => {
                this._liveCursorSweepTimeout = undefined;

                this.sweepLiveCursors();

                if (this._liveCursorsMap.size > 0) {
                    this.scheduleLiveCursorSweep();
                }
            }, LiveCanvas.liveCursorSweepFrequency);
        }
    }

    private getCursor(clientId: string, userInfo?: IUserInfo): LiveCursor {
        let liveCursor = this._liveCursorsMap.get(clientId);

        if (!liveCursor) {
            liveCursor = this.onCreateLiveCursor
                ? this.onCreateLiveCursor(clientId, userInfo)
                : new BuiltInLiveCursor(clientId, userInfo);

            this._liveCursorsMap.set(clientId, liveCursor);
        } else if (userInfo?.displayName) {
            liveCursor.userInfo = userInfo;
        }

        if (!this._liveCursorsHost?.contains(liveCursor.renderedElement)) {
            this._liveCursorsHost?.appendChild(liveCursor.renderedElement);
        }

        this.scheduleLiveCursorSweep();

        return liveCursor;
    }

    private removeCursor(clientId: string) {
        const liveCursor = this._liveCursorsMap.get(clientId);

        if (liveCursor) {
            if (this._liveCursorsHost?.contains(liveCursor.renderedElement)) {
                this._liveCursorsHost.removeChild(liveCursor.renderedElement);
            }
        }

        // We do not remove the cursor component from the cursor map so that
        // we don't lose the color it got automatically attributed.
    }

    private updateCursorPosition(
        clientId: string,
        eventUserInfo?: IEventUserInfo,
        position?: IPoint
    ) {
        if (position) {
            this.liveRuntime.getClientInfo(clientId).then((clientInfo) => {
                if (this._inkingManager) {
                    const userInfo: IUserInfo = {
                        displayName: clientInfo?.displayName,
                        pictureUri: eventUserInfo?.pictureUri,
                    };
                    const liveCursor = this.getCursor(clientId, userInfo);

                    const screenPosition =
                        this._inkingManager.viewportToScreen(position);

                    liveCursor.setPosition(screenPosition);
                }
            });
        } else {
            this.removeCursor(clientId);
        }
    }

    private clearListeners() {
        this._storageListeners.forEach((listener, key) => {
            this._storageSolution?.off(key, listener as any);
        });
        this._inkingManagerListeners.forEach((listener, key) => {
            this._inkingManager?.off(key, listener as any);
        });
    }

    protected async initializingFirstTime(): Promise<void> {
        this._dryInkMap = SharedMap.create(
            this.runtime,
            LiveCanvas.dryInkMapKey
        );
        this._tree = (
            SharedTree as unknown as ISharedObjectKind<ITree> &
                SharedObjectKind<ITree>
        ).create(this.runtime, LiveCanvas.treeKey);
        const view = this._tree.viewWith(treeViewConfiguration);
        view.initialize(
            new LiveCanvasTreeNode({
                dryInkMap: new LiveCanvasStrokesMap([]),
            })
        );
        view.dispose();

        this.root.set(LiveCanvas.dryInkMapKey, this._dryInkMap.handle);
        this.root.set(LiveCanvas.treeKey, this._tree.handle);
    }

    protected async hasInitialized(): Promise<void> {
        const mapHandle = this.root.get<IFluidHandle<SharedMap>>(
            LiveCanvas.dryInkMapKey
        );

        if (mapHandle) {
            this._dryInkMap = await mapHandle.get();
        } else {
            throw new Error(
                `Unable to get SharedMap with key "${LiveCanvas.dryInkMapKey}"`
            );
        }

        const treeHandle = this.root.get<IFluidHandle<ITree>>(
            LiveCanvas.treeKey
        );
        if (treeHandle) {
            // Legacy containers will not have `_tree` and will have to fall back to `_dryInkMap`
            this._tree = await treeHandle.get();
            this._treeView = this._tree.viewWith(treeViewConfiguration);
            this._treeUndoRedo = createUndoRedoStacks(this._treeView.events);
            // TODO: listen for changes to root, pretty minor since we don't ever set it outside of the first time
        }
    }

    /**
     * Optional callback that allows the consuming application to provide a
     * a profile picture that will be used on remote devices to render shared cursors.
     */
    onGetLocalUserPictureUrl?: () => string | undefined;

    /**
     * Optional callback that allows the consuming application to provide its own
     * live cursor visual representation by extending the abstract `LiveCursor`
     * class. The callback is passed the user information retrieved via the
     * `onGetLocalUserInfo` calback, if provided.
     */
    onCreateLiveCursor?: (clientId: string, userInfo?: IUserInfo) => LiveCursor;

    /**
     * Initializes the live inking session.
     *
     * @param inkingManager The InkingManager instance providing the drawing and events that will be synchronized across clients.
     * @param allowedRoles Optional. Roles who are allowed to draw strokes
     * @param node Optional. A Fluid `LiveCanvasTree` `TreeNode` instance to swap out the underlying storage solution for strokes.
     * To learn more, look at Fluid's [SharedTree](https://fluidframework.com/docs/data-structures/tree/) documentation.
     *
     * @returns a void promise that resolves once complete.
     */
    async initialize(
        inkingManager: InkingManager,
        allowedRoles?: UserMeetingRole[],
        node?: LiveCanvasTreeNode
    ) {
        // Cleanup if already
        this.clearListeners();
        this._storageSolution?.dispose();

        // Update initialize state as pending
        this.initializeState = LiveDataObjectInitializeState.pending;

        this._inkingManager = inkingManager;
        if (allowedRoles) {
            this._allowedRoles = allowedRoles;
        }
        this._inkingManager.inputProvider = new LivePointerInputProvider(
            this._inkingManager.inputProvider,
            () => this.verifyLocalUserRoles()
        );
        this._logger = new LiveTelemetryLogger(this.runtime, this.liveRuntime);

        this.setupStorageProcessing(node);
        this.setupWetInkProcessing();

        this._liveCursorsHost = document.createElement("div");
        this._liveCursorsHost.style.position = "absolute";
        this._liveCursorsHost.style.pointerEvents = "none";
        this._liveCursorsHost.style.width = "100%";
        this._liveCursorsHost.style.height = "100%";
        this._liveCursorsHost.style.overflow = "hidden";
        inkingManager.hostElement.appendChild(this._liveCursorsHost);

        // Update initialize state as succeeded
        this.initializeState = LiveDataObjectInitializeState.succeeded;
    }

    /**
     * Changes the underlying {@link LiveCanvasTreeNode} node used for storing inking strokes.
     * To learn more, look at Fluid's [SharedTree](https://fluidframework.com/docs/data-structures/tree/) documentation.
     * @remarks
     * There is a default `LiveCanvasTree` node that is created for each `LiveCanvas`.
     * The purpose of this is to allow you to use a single `LiveCanvas` instance with an interchangable data source.
     * This will not cause the default `LiveCanvasTree` node to be deleted.
     */
    setTreeNode(node: LiveCanvasTreeNode) {
        // Legacy containers that only have _dryInkMap are not supported
        ExpectedError.assert(
            !this._treeView,
            "LiveCanvas:setTreeNode",
            "Cannot call `setTreeNode` on a 1.0 `LiveCanvas` instance using `SharedMap`.",
            'To fix this issue, create a new Fluid container or `LiveCanvas` instance. You can also proactively check if this API is available using `LiveCanvas.ddsVersion === "2.0"`.'
        );
        // Cleanup existing
        this._storageSolution?.dispose();
        this.clearListeners();
        this._inkingManager?.clear();
        // Resetup storage & inking
        this.setupStorageProcessing(node);
        this.setupWetInkProcessing();
    }

    /**
     * Undo the most recent stroke in this `LiveCanvas` instance's {@link LiveCanvasTreeNode} node.
     *
     * @remarks
     * Only works in {@link ddsVersion} 2.0 and when using the default {@link LiveCanvasTreeNode} node as the data source.
     * If you use your own `node` to {@link initialize} or {@link setTreeNode}, undo/redo must be handled via your root `TreeView`.
     */
    undo() {
        ExpectedError.assert(
            this.ddsVersion === "2.0",
            "LiveCanvas:undo",
            "Cannot call `undo` on a 1.0 `LiveCanvas` instance using `SharedMap`.",
            'To fix this issue, create a new Fluid container or `LiveCanvas` instance. You can also proactively check if this API is available using `LiveCanvas.ddsVersion === "2.0"`.'
        );
        UnexpectedError.assert(
            !!this._treeUndoRedo,
            "LiveCanvas:undo",
            "`this._treeUndoRedo` is unexpectedly undefined despite `this.ddsVersion` being 2.0, which is a valid version."
        );
        this._treeUndoRedo.undo();
    }

    /**
     * Redo the most recent stroke in this `LiveCanvas` instance's {@link LiveCanvasTreeNode} node.
     *
     * @remarks
     * Only works in {@link ddsVersion} 2.0 and when using the default {@link LiveCanvasTreeNode} node as the data source.
     * If you use your own `node` to {@link initialize} or {@link setTreeNode}, undo/redo must be handled via your root `TreeView`.
     */
    redo() {
        ExpectedError.assert(
            this.ddsVersion === "2.0",
            "LiveCanvas:redo",
            "Cannot call `redo` on a 1.0 `LiveCanvas` instance using `SharedMap`.",
            'To fix this issue, create a new Fluid container or `LiveCanvas` instance. You can also proactively check if this API is available using `LiveCanvas.ddsVersion === "2.0"`.'
        );
        UnexpectedError.assert(
            !!this._treeUndoRedo,
            "LiveCanvas:redo",
            "`this._treeUndoRedo` is unexpectedly undefined despite `this.ddsVersion` being 2.0, which is a valid version."
        );
        this._treeUndoRedo.redo();
    }

    override dispose() {
        this.clearListeners();
        this._treeView?.dispose();
        this._storageSolution?.dispose();
        this._treeUndoRedo?.dispose();
        super.dispose();
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
                this.onLocalUserAllowed(async () => {
                    // Send a pointer moved event with an undefined
                    // point to indicated the cursor is not shared anymore
                    try {
                        await this._pointerMovedEventTarget.sendEvent({});
                    } catch (err) {
                        this._logger?.sendErrorEvent(
                            TelemetryEvents.LiveCanvas.PointerMovedEventError,
                            err
                        );
                    }
                });
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
     * Returns 2.0 if the `LiveCanvas` instance was created in `@microsoft/live-share-canvas` >=2.0.0.
     * Otherwise, returns 1.0.
     * @remarks
     * Intended to know when it is safe to set the `node` prop in {@link initialize} or {@link setTreeNode}.
     * Also helpful for knowing whether {@link undo} or {@link redo} will work.
     */
    get ddsVersion(): "1.0" | "2.0" {
        if (!this._treeView) {
            return "1.0";
        }
        return "2.0";
    }
}

/**
 * Enables live and collaborative inking.
 */
export type LiveCanvas = LiveCanvasClass;

// eslint-disable-next-line no-redeclare
export const LiveCanvas = (() => {
    const kind = createDataObjectKind(LiveCanvasClass);
    return kind as typeof kind & SharedObjectKind<LiveCanvasClass>;
})();

/**
 * Register `LiveCanvas` as an available `SharedObjectKind` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LiveCanvas, LiveCanvas.TypeName);
