/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory } from "@fluidframework/aqueduct";
import {
    DynamicObjectRegistry,
    LiveDataObject,
    LiveTelemetryLogger,
    UserMeetingRole,
} from "@microsoft/live-share";
import { MediaPlayerSynchronizer } from "./MediaPlayerSynchronizer";
import { ITriggerActionEvent, TelemetryEvents } from "./internals";
import {
    MediaSessionCoordinatorEvents,
    ExtendedMediaSessionAction,
    ExtendedMediaSessionActionDetails,
} from "./MediaSessionExtensions";
import {
    LiveMediaSessionCoordinator,
    IMediaPlayerState,
} from "./LiveMediaSessionCoordinator";
import { MediaSessionActionThrottler } from "./MediaSessionActionThrottler";
import { RepeatedActionThrottler } from "./RepeatedActionThrottler";
import { IMediaPlayer } from "./IMediaPlayer";

/**
 * Live fluid object that synchronizes media playback across multiple clients.
 */
export class LiveMediaSession extends LiveDataObject {
    private _actionThrottler: MediaSessionActionThrottler =
        new RepeatedActionThrottler();
    private _logger?: LiveTelemetryLogger;
    private _requestPlayerStateHandler?: () => IMediaPlayerState;
    private _coordinator?: LiveMediaSessionCoordinator;
    private readonly _actionHandlers: Map<string, MediaSessionActionHandler> =
        new Map();
    private _synchronizing?: MediaPlayerSynchronizer;

    // Position update timer
    private _updateTimer: any;
    private _lastUpdateTime: number = 0;

    /**
     * The objects fluid type name.
     */
    public static readonly TypeName = `@microsoft/fluid-media:SharedMediaSession`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveMediaSession.TypeName,
        LiveMediaSession,
        [],
        {}
    );

    /**
     * Extension point that lets applications replace the default logic for throttling the sessions
     * local sync behavior.
     *
     * @remarks
     * The `LiveMediaCoordinator` is fairly aggressive at wanting to keep the local media player
     * in sync with the rest of the group. This aggressiveness can result in the coordinator sending
     * new sync actions before the local player has finished responding to the previous sync action.
     * The `ActionThrottler` gives apps fine grain control over how aggressive they want sync to be.
     *
     * By default, a `RepeatedAction` throttler is used which prevents the same sync action from
     * being sent within an adjustable time period.
     */
    public get actionThrottler(): MediaSessionActionThrottler {
        return this._actionThrottler;
    }

    public set actionThrottler(value: MediaSessionActionThrottler) {
        this._actionThrottler = value;
    }

    /**
     * Returns true if the object has been initialized.
     */
    public get isInitialized(): boolean {
        return this.coordinator.isInitialized;
    }

    /**
     * The group coordinator for the session.
     */
    public get coordinator(): LiveMediaSessionCoordinator {
        return this._coordinator!;
    }

    /**
     * Returns the logger used by the session and coordinator.
     *
     * @remarks
     * This is used by the `MediaPlayerSynchronizer` to log events.
     */
    public get logger(): LiveTelemetryLogger {
        return this._logger!;
    }

    /**
     * initialize the object.
     * @param allowedRoles Optional. List of roles allowed to group transport
     * operations like play/pause/seek/setTrack.
     * @returns a void promise that resolves once complete
     */
    public initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        if (allowedRoles) {
            this._allowedRoles = allowedRoles;
        }
        return this.coordinator.initialize(allowedRoles);
    }

    /**
     * Registers an action handler with the session.
     * @param action Name of the action to register a handler for.
     * @param handler Function called when the action is triggered.
     */
    public setActionHandler(
        action: ExtendedMediaSessionAction,
        handler: MediaSessionActionHandler | null
    ): void {
        if (handler) {
            // add handler
            this._actionHandlers.set(action, handler);
        } else if (this._actionHandlers.has(action)) {
            // remove handler
            this._actionHandlers.delete(action);
        }
    }

    /**
     * Registers a handler that will be queried anytime the group coordinate needs to know the
     * local players transport state and position.
     */
    public setRequestPlayerStateHandler(handler: () => IMediaPlayerState) {
        this._requestPlayerStateHandler = handler;
    }

    /**
     * Begins synchronizing the playback of a media element.
     * @param player Something that "looks like" and HTML Media Element.
     * @returns A new synchronizer instance. Call `synchronizer.end()` to stop synchronizing the elements playback.
     */
    public synchronize(player: IMediaPlayer): MediaPlayerSynchronizer {
        // A session can only synchronize one player at a time
        if (this._synchronizing) {
            this._synchronizing.end();
        }

        // Start position update timer
        if (!this._updateTimer) {
            this.logger.sendTelemetryEvent(
                TelemetryEvents.MediaSession.BeginPositionUpdateTimer
            );
            this._updateTimer = setInterval(() => {
                // Get current state
                const state = this.getCurrentPlayerState();

                // Check for hit wait point
                this.checkWaitPointHit(state);

                // Send position update if interval hit
                const now = new Date().getTime();
                const delta = (now - this._lastUpdateTime) / 1000;
                if (
                    this.coordinator.isInitialized &&
                    delta >= this.coordinator.positionUpdateInterval
                ) {
                    this._lastUpdateTime = now;
                    this.coordinator.sendPositionUpdate(state);
                }
            }, 500);
        }

        return new MediaPlayerSynchronizer(player, this, () => {
            this._synchronizing = undefined;
        });
    }

    protected async hasInitialized(): Promise<void> {
        this._logger = new LiveTelemetryLogger(this.runtime, this.liveRuntime);

        // Create coordinator and listen for triggered actions
        this._coordinator = new LiveMediaSessionCoordinator(
            this.runtime,
            this.liveRuntime,
            () => this.getCurrentPlayerState()
        );
        this._coordinator.on(
            MediaSessionCoordinatorEvents.triggeraction,
            (event: ITriggerActionEvent) => {
                // Pre-process actions
                const details = event.details;
                const seekTime =
                    typeof details.seekTime == "number" ? details.seekTime : -1;
                switch (details.action) {
                    case "play":
                        this.logger.sendTelemetryEvent(
                            TelemetryEvents.MediaSession.PlayAction,
                            null,
                            {
                                position: seekTime,
                            }
                        );
                        break;
                    case "pause":
                        this.logger.sendTelemetryEvent(
                            TelemetryEvents.MediaSession.PauseAction,
                            null,
                            {
                                position: seekTime,
                            }
                        );
                        break;
                    case "seekto":
                        this.logger.sendTelemetryEvent(
                            TelemetryEvents.MediaSession.SeekToAction,
                            null,
                            {
                                position: seekTime,
                            }
                        );
                        break;
                    case "settrack":
                        this.logger.sendTelemetryEvent(
                            TelemetryEvents.MediaSession.SetTrackAction
                        );
                        break;
                    case "datachange":
                        this.logger.sendTelemetryEvent(
                            TelemetryEvents.MediaSession.DataChangeAction
                        );
                        break;
                    case "catchup":
                        // Default to seekto if catchup not implemented
                        this.logger.sendTelemetryEvent(
                            TelemetryEvents.MediaSession.CatchUpAction,
                            null,
                            {
                                position: seekTime,
                            }
                        );
                        if (!this._actionHandlers.has("catchup")) {
                            details.action = "seekto";
                        }
                        break;
                }

                // Dispatch action
                this.dispatchAction(details);
            }
        );
    }

    private checkWaitPointHit(state: IMediaPlayerState): void {
        // Was a wait point hit?
        if (state.positionState && this.coordinator.isInitialized) {
            const waitPoint = this.coordinator.findNextWaitPoint();
            if (
                waitPoint &&
                state.positionState.position != undefined &&
                state.positionState.position >= waitPoint.position
            ) {
                // Ensure handler registered
                if (!this._actionHandlers.has("wait")) {
                    throw new Error(
                        `SharedMediaSession: wait point hit but no 'wait' action registered.`
                    );
                }

                // Begin suspension for wait point
                const suspension = this.coordinator.beginSuspension(waitPoint);
                this.dispatchAction({ action: "wait", suspension: suspension });
            }
        }
    }

    private getCurrentPlayerState(): IMediaPlayerState {
        if (!this._requestPlayerStateHandler) {
            throw new Error(
                `LiveMediaSession: no getPlayerState callback configured.`
            );
        }

        return this._requestPlayerStateHandler();
    }

    private dispatchAction(
        details: MediaSessionActionDetails | ExtendedMediaSessionActionDetails
    ): void {
        if (this._actionHandlers.has(details.action)) {
            const handler = this._actionHandlers.get(details.action);
            this._actionThrottler.throttled(details, handler);
        }
    }
}

/**
 * Register `LiveMediaSession` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(
    LiveMediaSession,
    LiveMediaSession.TypeName
);
