/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    LiveEventScope,
    LiveTelemetryLogger,
    LiveEventTarget,
    ILiveEvent,
    IRuntimeSignaler,
    TimeInterval,
    UserMeetingRole,
} from "@microsoft/live-share";
import {
    CoordinationWaitPoint,
    ExtendedMediaSessionActionDetails,
    ExtendedMediaMetadata,
    ExtendedMediaSessionPlaybackState,
    MediaSessionCoordinatorEvents,
    MediaSessionCoordinatorState,
    MediaSessionCoordinatorSuspension,
} from "./MediaSessionExtensions";
import {
    TelemetryEvents,
    ITransportCommandEvent,
    ISetTrackEvent,
    IPositionUpdateEvent,
    GroupCoordinatorState,
    GroupCoordinatorStateEvents,
    ITriggerActionEvent,
    ISetTrackDataEvent,
} from "./internals";
import { LiveMediaSessionCoordinatorSuspension } from "./LiveMediaSessionCoordinatorSuspension";
import EventEmitter from "events";

/**
 * Most recent state of the media session.
 */
export interface IMediaPlayerState {
    /**
     * Metadata for the sessions current track.
     */
    metadata: ExtendedMediaMetadata | null;

    /**
     * Optional track data object being synchronized.
     *
     * @remarks
     * This can be used to sync things like pitch, roll, and yaw when watching 360 videos together.
     */
    trackData: object | null;

    /**
     * Sessions current playback state.
     */
    playbackState: ExtendedMediaSessionPlaybackState;

    /**
     * Sessions current position state if known.
     */
    positionState?: MediaPositionState;
}

/**
 * The `LiveMediaSessionCoordinator` tracks the playback & position state of all other
 * clients being synchronized with. It is responsible for keeping the local media player
 * in sync with the group.
 */
export class LiveMediaSessionCoordinator extends EventEmitter {
    private readonly _runtime: IRuntimeSignaler;
    private readonly _logger: LiveTelemetryLogger;
    private readonly _getPlayerState: () => IMediaPlayerState;
    private _positionUpdateInterval = new TimeInterval(2000);
    private _maxPlaybackDrift = new TimeInterval(1000);
    private _lastWaitPoint?: CoordinationWaitPoint;
    private _hasInitialized = false;

    // Broadcast events
    private _playEvent?: LiveEventTarget<ITransportCommandEvent>;
    private _pauseEvent?: LiveEventTarget<ITransportCommandEvent>;
    private _seekToEvent?: LiveEventTarget<ITransportCommandEvent>;
    private _setTrackEvent?: LiveEventTarget<ISetTrackEvent>;
    private _setTrackDataEvent?: LiveEventTarget<ISetTrackDataEvent>;
    private _positionUpdateEvent?: LiveEventTarget<IPositionUpdateEvent>;
    private _joinedEvent?: LiveEventTarget<ILiveEvent>;

    // Distributed state
    private _groupState?: GroupCoordinatorState;

    /**
     * @hidden
     * Applications shouldn't directly create new coordinator instances.
     */
    constructor(runtime: IRuntimeSignaler, getPlayerState: () => IMediaPlayerState) {
        super();
        this._runtime = runtime;
        this._logger = new LiveTelemetryLogger(runtime);
        this._getPlayerState = getPlayerState;
    }

    /**
     * Controls whether or not the local client is allowed to instruct the group to play or pause.
     *
     * @remarks
     * This flag largely meant to influence decisions made by the coordinator and can be used by
     * the UI to determine what controls should be shown to the user. It does not provide any
     * security in itself.
     *
     * If your app is running in a semi-trusted environment where only some clients are allowed
     * to play/pause media, you should use "role based verification" to enforce those policies.
     */
    public canPlayPause: boolean = true;

    /**
     * Controls whether or not the local client is allowed to seek the group to a new playback
     * position.
     *
     * @remarks
     * This flag largely meant to influence decisions made by the coordinator and can be used by
     * the UI to determine what controls should be shown to the user. It does not provide any
     * security in itself.
     *
     * If your app is running in a semi-trusted environment where only some clients are allowed
     * to change the playback position, you should use "role based verification" to enforce those policies.
     */
    public canSeek: boolean = true;

    /**
     * Controls whether or not the local client is allowed to change tracks.
     *
     * @remarks
     * This flag largely meant to influence decisions made by the coordinator and can be used by
     * the UI to determine what controls should be shown to the user. It does not provide any
     * security in itself.
     *
     * If your app is running in a semi-trusted environment where only some clients are allowed
     * to change tracks, you should use "role based verification" to enforce those policies.
     */
    public canSetTrack: boolean = true;

    /**
     * Controls whether or not the local client is allowed to change the tracks custom data object.
     *
     * @remarks
     * This flag largely meant to influence decisions made by the coordinator and can be used by
     * the UI to determine what controls should be shown to the user. It does not provide any
     * security in itself.
     *
     * If your app is running in a semi-trusted environment where only some clients are allowed
     * to change the tracks data object, you should use "role based verification" to enforce those
     * policies.
     */
    public canSetTrackData: boolean = true;

    /**
     * Returns true if the local client is in a suspended state.
     */
    public get isSuspended(): boolean {
        return this._groupState ? this._groupState.isSuspended : false;
    }

    /**
     * Max amount of playback drift allowed in seconds.
     *
     * @remarks
     * Should the local clients playback position lag by more than the specified value, the
     * coordinator will trigger a `catchup` action.
     *
     * Defaults to a value of `1` second.
     */
    public get maxPlaybackDrift(): number {
        return this._maxPlaybackDrift.seconds;
    }

    public set maxPlaybackDrift(value: number) {
        this._maxPlaybackDrift.seconds = value;
    }

    /**
     * Frequency with which position updates are broadcast to the rest of the group in
     * seconds.
     *
     * @remarks
     * Defaults to a value of `2` seconds.
     */
    public get positionUpdateInterval(): number {
        return this._positionUpdateInterval.seconds;
    }

    public set positionUpdateInterval(value: number) {
        this._positionUpdateInterval.seconds = value;
    }

    /**
     * Instructs the group to play the current track.
     *
     * @remarks
     * Throws an exception if the session/coordinator hasn't been initialized, no track has been
     * loaded, or `canPlayPause` is false.
     */
    public play(): void {
        if (!this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.play() called before initialize() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(`LiveMediaSessionCoordinator.play() called before MediaSession.metadata assigned.`);
        }

        if (!this.canPlayPause) {
            throw new Error(`LiveMediaSessionCoordinator.play() operation blocked.`);
        }

        // Get projected position
        const position = this.getPlayerPosition();

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.PlayCalled, null, { position: position });
        this._playEvent!.sendEvent({
            track: this._groupState.playbackTrack.current,
            position: position,
        });
    }

    /**
     * Instructs the group to pause the current track.
     *
     * @remarks
     * Throws an exception if the session/coordinator hasn't been initialized, no track has been
     * loaded, or `canPlayPause` is false.
     */
    public pause(): void {
        if (!this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.pause() called before initialize() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(`LiveMediaSessionCoordinator.pause() called before MediaSession.metadata assigned.`);
        }

        if (!this.canPlayPause) {
            throw new Error(`LiveMediaSessionCoordinator.pause() operation blocked.`);
        }

        // Get projected position
        const position = this.getPlayerPosition();

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.PauseCalled, null, { position: position });
        this._pauseEvent!.sendEvent({
            track: this._groupState.playbackTrack.current,
            position: position,
        });
    }

    /**
     * Instructs the group to seek to a new position within the current track.
     *
     * @remarks
     * Throws an exception if the session/coordinator hasn't been initialized, no track has been
     * loaded, or `canSeek` is false.
     * @param time Playback position in seconds to seek to.
     */
    public seekTo(time: number): void {
        if (!this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.seekTo() called before initialize() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(`LiveMediaSessionCoordinator.seekTo() called before MediaSession.metadata assigned.`);
        }

        if (!this.canSeek) {
            throw new Error(`LiveMediaSessionCoordinator.seekTo() operation blocked.`);
        }

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.SeekToCalled, null, { position: time });
        this._seekToEvent!.sendEvent({
            track: this._groupState.playbackTrack.current,
            position: time,
        });
    }

    /**
     * Instructs the group to load a new track.
     *
     * @remarks
     * Throws an exception if the session/coordinator hasn't been initialized or `canSetTrack` is
     * false.
     * @param metadata The track to load or `null` to indicate that the end of the track is reached.
     * @param waitPoints Optional. List of static wait points to configure for the track.  Dynamic wait points can be added via the `beginSuspension()` call.
     */
    public setTrack(metadata: ExtendedMediaMetadata | null, waitPoints?: CoordinationWaitPoint[]): void {
        if (!this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.setTrack() called before initialize() called.`);
        }

        if (!this.canSetTrack) {
            throw new Error(`LiveMediaSessionCoordinator.setTrack() operation blocked.`);
        }

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.SetTrackCalled);
        this._setTrackEvent!.sendEvent({
            metadata: metadata,
            waitPoints: waitPoints || [],
        });
    }

    /**
     * Updates the track data object for the current track.
     *
     * @remarks
     * The track data object can be used by applications to synchronize things like pitch, roll,
     * and yaw of a 360 video. This data object will be reset to null anytime the track changes.
     *
     * Throws an exception if the session/coordinator hasn't been initialized or `canSetTrackData` is
     * false.
     * @param data New data object to sync with the group. This value will be synchronized using a last writer wins strategy.
     */
    public setTrackData(data: object | null): void {
        if (!this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.setTrackData() called before initialize() called.`);
        }

        if (!this.canSetTrackData) {
            throw new Error(`LiveMediaSessionCoordinator.setTrackData() operation blocked.`);
        }

        // Send transport command
        this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.SetTrackDataCalled);
        this._setTrackDataEvent!.sendEvent({
            data: data,
        });
    }

    /**
     * Begins a new local suspension.
     *
     * @remarks
     * Suspension temporarily suspend the clients local synchronization with the group. This can
     * be useful for displaying ads to users or temporarily disconnecting from the session while
     * the user seeks the video using a timeline scrubber.
     *
     * Multiple simultaneous suspensions are allowed and when the last suspension ends the local
     * client will be immediately re-synchronized with the group.
     *
     * A "Dynamic Wait Point" can be specified when `beginSuspension()` is called and the wait
     * point will be broadcast to all other clients in the group.  Those clients will then
     * automatically enter a suspension state once they reach the positions specified by the
     * wait point. Clients that are passed the wait point will immediately suspend.
     *
     * Any wait point based suspension (dynamic or static) will result in all clients remaining
     * in a suspension state until the list client ends their suspension. This behavior can be
     * conditionally bypassed by settings the wait points `maxClients` value.
     *
     * Throws an exception if the session/coordinator hasn't been initialized.
     * @param waitPoint Optional. Dynamic wait point to broadcast to all of the clients.
     * @returns The suspension object. Call `end()` on the returned suspension to end the suspension.
     */
    public beginSuspension(waitPoint?: CoordinationWaitPoint): MediaSessionCoordinatorSuspension {
        if (!this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.beginSuspension() called before initialize() called.`);
        }

        if (!this._groupState?.playbackTrack.current.metadata) {
            throw new Error(
                `LiveMediaSessionCoordinator.beginSuspension() called before MediaSession.metadata assigned.`
            );
        }

        // Tell group state that suspension is started
        if (waitPoint) {
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.BeginSuspensionAndWait, null, {
                position: waitPoint.position,
                maxClients: waitPoint.maxClients,
            });
            this._lastWaitPoint = waitPoint;
            this._groupState.beginSuspension(waitPoint);
        } else {
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.BeginSuspension);
            this._groupState.beginSuspension();
        }

        // Return new suspension object
        return new LiveMediaSessionCoordinatorSuspension(waitPoint, (time) => {
            if (waitPoint) {
                this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.EndSuspensionAndWait, null, {
                    position: waitPoint.position,
                    maxClients: waitPoint.maxClients,
                });
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

    /**
     * @hidden
     * Called by MediaSession to verify the coordinator has been initialized.
     */
    public get isInitialized(): boolean {
        return this._hasInitialized;
    }

    /**
     * @hidden
     * Called by MediaSession to start coordinator.
     */
    public async initialize(acceptTransportChangesFrom?: UserMeetingRole[]): Promise<void> {
        if (this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.initialize() already initialized.`);
        }

        // Create children
        await this.createChildren(acceptTransportChangesFrom);
        this._hasInitialized = true;
    }

    /**
     * @hidden
     * Called by the MediaSession to detect if a wait point has been hit.
     */
    public findNextWaitPoint(): CoordinationWaitPoint | null {
        return this._groupState?.playbackTrack.findNextWaitPoint(this._lastWaitPoint) || null;
    }

    /**
     * @hidden
     * Called by MediaSession to trigger the sending of a position update.
     */
    public sendPositionUpdate(state: IMediaPlayerState): void {
        if (!this._hasInitialized) {
            throw new Error(`LiveMediaSessionCoordinator.sendPositionUpdate() called before initialize() called.`);
        }

        // Send position update event
        const evt = this._groupState!.createPositionUpdateEvent(state);
        this._positionUpdateEvent?.sendEvent(evt);
    }

    protected async createChildren(acceptTransportChangesFrom?: UserMeetingRole[]): Promise<void> {
        // Create event scopes
        const scope = new LiveEventScope(this._runtime, acceptTransportChangesFrom);
        const unrestrictedScope = new LiveEventScope(this._runtime);

        // Initialize internal coordinator state
        this._groupState = new GroupCoordinatorState(
            this._runtime,
            this._maxPlaybackDrift,
            this._positionUpdateInterval,
            this._getPlayerState
        );
        this._groupState.on(GroupCoordinatorStateEvents.triggeraction, (evt) => this.emit(evt.name, evt));

        // Listen for track changes
        this._setTrackEvent = new LiveEventTarget<ISetTrackEvent>(scope, "setTrack", (event, local) =>
            this._groupState!.handleSetTrack(event, local)
        );
        this._setTrackDataEvent = new LiveEventTarget<ISetTrackDataEvent>(scope, "setTrackData", (event, local) =>
            this._groupState!.handleSetTrackData(event, local)
        );

        // Listen for transport commands
        this._playEvent = new LiveEventTarget(scope, "play", (event, local) =>
            this._groupState!.handleTransportCommand(event, local)
        );
        this._pauseEvent = new LiveEventTarget(scope, "pause", (event, local) =>
            this._groupState!.handleTransportCommand(event, local)
        );
        this._seekToEvent = new LiveEventTarget(scope, "seekTo", (event, local) =>
            this._groupState!.handleTransportCommand(event, local)
        );

        // Listen for position updates
        this._positionUpdateEvent = new LiveEventTarget(unrestrictedScope, "positionUpdate", (event, local) =>
            this._groupState!.handlePositionUpdate(event, local)
        );

        // Listen for joined event
        this._joinedEvent = new LiveEventTarget(unrestrictedScope, "joined", (evt, local) => {
            // Immediately send a position update
            this._logger.sendTelemetryEvent(TelemetryEvents.SessionCoordinator.RemoteJoinReceived, null, {
                correlationId: LiveTelemetryLogger.formatCorrelationId(evt.clientId, evt.timestamp),
            });
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
            case "none":
            case "ended":
                return 0.0;
            default:
                return positionState && positionState.position != undefined ? positionState.position : 0.0;
        }
    }
}
