/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { EphemeralTelemetryLogger, UserMeetingRole } from '@microsoft/live-share';
import { MediaPlayerSynchronizer } from './MediaPlayerSynchronizer';
import { ITriggerActionEvent, TelemetryEvents } from './internals';
import { MediaSessionCoordinatorEvents, ExtendedMediaSessionAction, ExtendedMediaSessionActionDetails } from './MediaSessionExtensions';
import { EphemeralMediaSessionCoordinator, IMediaPlayerState } from './EphemeralMediaSessionCoordinator';
import { MediaSessionActionThrottler } from './MediaSessionActionThrottler';
import { RepeatedActionThrottler } from './RepeatedActionThrottler';
import { IMediaPlayer } from './IMediaPlayer';

export class EphemeralMediaSession extends DataObject {
    private _actionThrottler: MediaSessionActionThrottler = new RepeatedActionThrottler();
    private _logger?: EphemeralTelemetryLogger;
    private _onRequestPlayerState?: () => IMediaPlayerState;
    private _coordinator?: EphemeralMediaSessionCoordinator;
    private readonly _actionHandlers: Map<string, MediaSessionActionHandler> = new Map();
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
        EphemeralMediaSession.TypeName,
        EphemeralMediaSession,
        [],
        {}
    );

    protected async hasInitialized(): Promise<void> {
        this. _logger = new EphemeralTelemetryLogger(this.runtime);

        // Create coordinator and listen for triggered actions
        this._coordinator = new EphemeralMediaSessionCoordinator(this.runtime, () => this.getCurrentPlayerState());
        this._coordinator.on(MediaSessionCoordinatorEvents.triggeraction, (event: ITriggerActionEvent) => {
            // Pre-process actions
            const details = event.details;
            const seekTime = typeof details.seekTime == 'number' ? details.seekTime : -1;
            switch (details.action) {
                case 'play':
                    this.logger.sendTelemetryEvent(TelemetryEvents.MediaSession.PlayAction, null, {position: seekTime});
                    break;
                case 'pause':
                    this.logger.sendTelemetryEvent(TelemetryEvents.MediaSession.PauseAction, null, {position: seekTime});
                    break;
                case 'seekto':
                    this.logger.sendTelemetryEvent(TelemetryEvents.MediaSession.SeekToAction, null, {position: seekTime});
                    break;
                case 'settrack':
                    this.logger.sendTelemetryEvent(TelemetryEvents.MediaSession.SetTrackAction);
                    break;
                case 'datachange':
                    this.logger.sendTelemetryEvent(TelemetryEvents.MediaSession.DataChangeAction);
                    break;
                case 'catchup':
                    // Default to seekto if catchup not implemented
                    this.logger.sendTelemetryEvent(TelemetryEvents.MediaSession.CatchUpAction, null, {position: seekTime});
                    if (!this._actionHandlers.has('catchup')) {
                        details.action = 'seekto';
                    }
                    break;
            }

            // Dispatch action
            this.dispatchAction(details);
        });
    }

    public get actionThrottler(): MediaSessionActionThrottler {
        return this._actionThrottler;
    }

    public set actionThrottler(value: MediaSessionActionThrottler) {
        this._actionThrottler = value;
    }

    public get isStarted(): boolean {
        return this.coordinator.isStarted;
    }

    public get coordinator(): EphemeralMediaSessionCoordinator {
        return this._coordinator!;
    }

    public set onRequestPlayerState(handler: () => IMediaPlayerState) {
        this._onRequestPlayerState = handler;
    }

    public get logger(): EphemeralTelemetryLogger {
        return this._logger!;
    }

    public async start(acceptTransportChangesFrom?: UserMeetingRole[]): Promise<void> {
        this.coordinator.start(acceptTransportChangesFrom);
    }

    public setActionHandler(action: ExtendedMediaSessionAction, handler: MediaSessionActionHandler | null): void {
        if (handler) {
            // add handler
            this._actionHandlers.set(action, handler);

        } else if (this._actionHandlers.has(action)) {
            // remove handler
            this._actionHandlers.delete(action);
        }
    }

    public synchronize(player: IMediaPlayer): MediaPlayerSynchronizer {
        // A session can only synchronize one player at a time
        if (this._synchronizing) {
            this._synchronizing.end();
        }

        // Start position update timer
        if (!this._updateTimer) {
            this.logger.sendTelemetryEvent(TelemetryEvents.MediaSession.BeginPositionUpdateTimer);
            this._updateTimer = setInterval(() => {
                // Get current state
                const state = this.getCurrentPlayerState();

                // Check for hit wait point
                this.checkWaitPointHit(state);

                // Send position update if interval hit
                const now = new Date().getTime();
                const delta = (now - this._lastUpdateTime) / 1000;
                if (this.coordinator.isStarted && delta >= this.coordinator.positionUpdateInterval) {
                    this._lastUpdateTime = now;
                    this.coordinator.sendPositionUpdate(state);
                }
            }, 500);
        }

        return new MediaPlayerSynchronizer(player, this, () => {
            this._synchronizing = undefined;
        });
    }

    private checkWaitPointHit(state: IMediaPlayerState): void {
        // Was a wait point hit?
        if (state.positionState && this.coordinator.isStarted) {
            const waitPoint = this.coordinator.findNextWaitPoint();
            if (waitPoint && state.positionState.position != undefined && state.positionState.position >= waitPoint.position) {
                // Ensure handler registered
                if (!this._actionHandlers.has('wait')) {
                    throw new Error(`SharedMediaSession: wait point hit but no 'wait' action registered.`);
                }

                // Begin suspension for wait point
                const suspension = this.coordinator.beginSuspension(waitPoint);
                this.dispatchAction({action: 'wait', suspension: suspension});
            }
        }
    }

    private getCurrentPlayerState(): IMediaPlayerState {
        if (!this._onRequestPlayerState) {
            throw new Error(`SharedMediaSession: no getPlayerState callback configured.`);
        }

        return this._onRequestPlayerState();
    }

    private dispatchAction(details: MediaSessionActionDetails|ExtendedMediaSessionActionDetails): void {
        if (this._actionHandlers.has(details.action)) {
            const handler = this._actionHandlers.get(details.action);
            this._actionThrottler.throttled(details, handler);
        }
    }
}
