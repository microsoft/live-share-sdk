/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EphemeralEventScope, EphemeralTelemetryLogger, EphemeralEventTarget, IEphemeralEvent, IRuntimeSignaler, TimeInterval, UserMeetingRole } from '@microsoft/live-share';
import { CoordinationWaitPoint, ExtendedMediaSessionActionDetails, ExtendedMediaMetadata, ExtendedMediaSessionPlaybackState, MediaSessionCoordinatorEvents, MediaSessionCoordinatorState, MediaSessionCoordinatorSuspension } from './MediaSessionExtensions';
import { TelemetryEvents, ITransportCommandEvent, ISetTrackEvent, IPositionUpdateEvent, GroupCoordinatorState, GroupCoordinatorStateEvents, ITriggerActionEvent, ISetTrackDataEvent } from './internals';
import { EphemeralMediaSessionCoordinatorSuspension } from './EphemeralMediaSessionCoordinatorSuspension';
import EventEmitter from "events";

/**
 * Most recent state of the media session.
 */
export interface IMediaPlayerState {
    metadata: ExtendedMediaMetadata|null;
    trackData: object|null;
    playbackState: ExtendedMediaSessionPlaybackState;
    positionState?: MediaPositionState;
}

/**
 * Implements MediaSessionCoordinator interface
 */
export class EphemeralMediaSessionCoordinator extends EventEmitter  {
    private readonly _runtime: IRuntimeSignaler;
    private readonly _logger: EphemeralTelemetryLogger;
    private readonly _getPlayerState: () => IMediaPlayerState;
    private _positionUpdateInterval = new TimeInterval(2000);
    private _maxPlaybackDrift = new TimeInterval(1000);
    private _lastWaitPoint?: CoordinationWaitPoint;
    private _hasStarted = false;

    // Broadcast events
    private _playEvent?: EphemeralEventTarget<ITransportCommandEvent>;
    private _pauseEvent?: EphemeralEventTarget<ITransportCommandEvent>;
    private _seekToEvent?: EphemeralEventTarget<ITransportCommandEvent>;
    private _setTrackEvent?: EphemeralEventTarget<ISetTrackEvent>;
    private _setTrackDataEvent?: EphemeralEventTarget<ISetTrackDataEvent>;
    private _positionUpdateEvent?: EphemeralEventTarget<IPositionUpdateEvent>;
    private _joinedEvent?: EphemeralEventTarget<IEphemeralEvent>;

    // Distributed state
    private _groupState?: GroupCoordinatorState;
    
    constructor(runtime: IRuntimeSignaler, getPlayerState: () => IMediaPlayerState) {
        super();
        this._runtime = runtime;
        this._logger = new EphemeralTelemetryLogger(runtime);
        this._getPlayerState = getPlayerState;
    }

    public get isStarted(): boolean {
        return this._hasStarted;
    }

    public canPlayPause: boolean = true;

    public canSeek: boolean = true;

    public canSetTrack: boolean = true;

    public canSetTrackData: boolean = true;

    public get isSuspended(): boolean {
        return this._groupState ? this._groupState.isSuspended : false;
    }

    public get maxPlaybackDrift(): number {
        return this._maxPlaybackDrift.seconds;
    }

    public set maxPlaybackDrift(value: number) {
        this._maxPlaybackDrift.seconds = value;
    }

    public get positionUpdateInterval(): number {
        return this._positionUpdateInterval.seconds;
    }

    public set positionUpdateInterval(value: number) {
        this._positionUpdateInterval.seconds = value;
    }

    public findNextWaitPoint(): CoordinationWaitPoint|null {
        return this._groupState?.playbackTrack.findNextWaitPoint(this._lastWaitPoint) || null;
    }

    public play(): void {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.play() called before start() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(`EphemeralMediaSessionCoordinator.play() called before MediaSession.metadata assigned.`);
        }

        if (!this.canPlayPause) {
            throw new Error(`EphemeralMediaSessionCoordinator.play() operation blocked.`);
        }

        // Get projected position
        const position = this.getPlayerPosition();

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.PlayCalled, null, {position: position});
        this._playEvent!.sendEvent({
            track: this._groupState.playbackTrack.current,
            position: position
        });
    }
    
    public pause(): void {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.pause() called before start() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(`EphemeralMediaSessionCoordinator.pause() called before MediaSession.metadata assigned.`);
        }

        if (!this.canPlayPause) {
            throw new Error(`EphemeralMediaSessionCoordinator.pause() operation blocked.`);
        }

        // Get projected position
        const position = this.getPlayerPosition();

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.PauseCalled, null, {position: position});
        this._pauseEvent!.sendEvent({
            track: this._groupState.playbackTrack.current,
            position: position
        });
    }

    public seekTo(time: number): void {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.seekTo() called before start() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(`EphemeralMediaSessionCoordinator.seekTo() called before MediaSession.metadata assigned.`);
        }

        if (!this.canSeek) {
            throw new Error(`EphemeralMediaSessionCoordinator.seekTo() operation blocked.`);
        }

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.SeekToCalled, null, {position: time});
        this._seekToEvent!.sendEvent({
            track: this._groupState.playbackTrack.current,
            position: time
        });
    }

    public setTrack(metadata: ExtendedMediaMetadata|null, waitPoints?: CoordinationWaitPoint[]): void {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.setTrack() called before start() called.`);
        }

        if (!this.canSetTrack) {
            throw new Error(`EphemeralMediaSessionCoordinator.setTrack() operation blocked.`);
        }

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.SetTrackCalled);
        this._setTrackEvent!.sendEvent({
            metadata: metadata,
            waitPoints: waitPoints || []
        });
    }

    public setTrackData(data: object|null): void {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.setTrackData() called before start() called.`);
        }

        if (!this.canSetTrackData) {
            throw new Error(`EphemeralMediaSessionCoordinator.setTrackData() operation blocked.`);
        }

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.SetTrackDataCalled);
        this._setTrackDataEvent!.sendEvent({
            data: data
        });
    }

    public beginSuspension(waitPoint?: CoordinationWaitPoint): MediaSessionCoordinatorSuspension {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.beginSuspension() called before start() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(`EphemeralMediaSessionCoordinator.beginSuspension() called before MediaSession.metadata assigned.`);
        }

        // Tell group state that suspension is started
        if (waitPoint) {
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.BeginSuspensionAndWait, null, {position: waitPoint.position, maxClients: waitPoint.maxClients});
            this._lastWaitPoint = waitPoint;
            this._groupState.beginSuspension(waitPoint);
        } else {
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.BeginSuspension);
            this._groupState.beginSuspension();
        }

        // Return new suspension object
        return new EphemeralMediaSessionCoordinatorSuspension(waitPoint, time => {
            if (waitPoint) {
                this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.EndSuspensionAndWait, null, {position: waitPoint.position, maxClients: waitPoint.maxClients});
            } else {
                this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.EndSuspension);
            }
            this._groupState!.endSuspension(time == undefined);
            if (time != undefined && !this._groupState?.isSuspended && !this._groupState?.isWaiting) {
                // Seek to new position
                this.seekTo(Math.max(time, 0.0));
            }
        });
    }

    public sendPositionUpdate(state: IMediaPlayerState): void {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.sendPositionUpdate() called before start() called.`);
        }

        // Send position update event
        const evt = this._groupState!.createPositionUpdateEvent(state);
        this._positionUpdateEvent?.sendEvent(evt);
    }

    public syncLocalMediaSession(): void {
        if (!this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.syncLocalMediaSession() called before start() called.`);
        }

        this._groupState!.syncLocalMediaSession();
    }

    public async start(acceptTransportChangesFrom?: UserMeetingRole[]): Promise<void> {
        if (this._hasStarted) {
            throw new Error(`EphemeralMediaSessionCoordinator.start() already started.`);
        }

        // Create children
        await this.createChildren(acceptTransportChangesFrom);
        this._hasStarted = true;
    }
    
    protected async createChildren(acceptTransportChangesFrom?: UserMeetingRole[]): Promise<void> {
        // Create event scopes
        const scope = new EphemeralEventScope(this._runtime, acceptTransportChangesFrom);
        const unrestrictedScope = new EphemeralEventScope(this._runtime);

        // Initialize internal coordinator state
        this._groupState = new GroupCoordinatorState(this._runtime, this._maxPlaybackDrift, this._positionUpdateInterval, this._getPlayerState);
        this._groupState.on(GroupCoordinatorStateEvents.triggeraction, evt => this.emit(evt.name, evt));

        // Listen for track changes
        this._setTrackEvent = new EphemeralEventTarget<ISetTrackEvent>(scope, 'setTrack', (event, local) => this._groupState!.handleSetTrack(event, local));
        this._setTrackDataEvent = new EphemeralEventTarget<ISetTrackDataEvent>(scope, 'setTrackData', (event, local) => this._groupState!.handleSetTrackData(event, local));

        // Listen for transport commands
        this._playEvent = new EphemeralEventTarget(scope, 'play', (event, local) => this._groupState!.handleTransportCommand(event, local));
        this._pauseEvent = new EphemeralEventTarget(scope, 'pause', (event, local) => this._groupState!.handleTransportCommand(event, local));
        this._seekToEvent = new EphemeralEventTarget(scope, 'seekTo', (event, local) => this._groupState!.handleTransportCommand(event, local));

        // Listen for position updates
        this._positionUpdateEvent = new EphemeralEventTarget(unrestrictedScope, 'positionUpdate', (event, local) => this._groupState!.handlePositionUpdate(event, local));

        // Listen for joined event
        this._joinedEvent = new EphemeralEventTarget(unrestrictedScope, 'joined', (evt, local) => {
            // Immediately send a position update
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.RemoteJoinReceived, null, {correlationId: EphemeralTelemetryLogger.formatCorrelationId(evt.clientId, evt.timestamp)});
            const state = this._getPlayerState();
            const update = this._groupState!.createPositionUpdateEvent(state);
            this._positionUpdateEvent?.sendEvent(update);
        });

        // Send initial joined event
        this._joinedEvent.sendEvent({});
    }

    private getPlayerPosition(): number {
        const { positionState, playbackState } = this._getPlayerState();
        switch (playbackState) {
            case 'none':
            case 'ended':
                return 0.0;
            default:
                return positionState && positionState.position != undefined ? positionState.position : 0.0;
        }
    } 
}
