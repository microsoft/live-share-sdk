/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    LiveEventScope,
    LiveTelemetryLogger,
    LiveEventTarget,
    IRuntimeSignaler,
    TimeInterval,
    UserMeetingRole,
    LiveShareRuntime,
    LiveDataObjectInitializeState,
    LiveDataObjectInitializeNotNeededError,
    LiveDataObjectNotInitializedError,
} from "@microsoft/live-share";
import {
    CoordinationWaitPoint,
    ExtendedMediaMetadata,
    ExtendedMediaSessionPlaybackState,
    MediaSessionCoordinatorSuspension,
} from "./MediaSessionExtensions";
import {
    TelemetryEvents,
    ITransportCommandEvent,
    ISetTrackEvent,
    IPositionUpdateEvent,
    GroupCoordinatorState,
    GroupCoordinatorStateEvents,
    ISetTrackDataEvent,
    TrackMetadataNotSetError,
    ActionBlockedError,
} from "./internals";
import { LiveMediaSessionCoordinatorSuspension } from "./LiveMediaSessionCoordinatorSuspension";
import EventEmitter from "events";
import { isErrorLike } from "@microsoft/live-share/bin/internals";

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
    private readonly _liveRuntime: LiveShareRuntime;
    private readonly _logger: LiveTelemetryLogger;
    private readonly _getPlayerState: () => IMediaPlayerState;
    private _positionUpdateInterval = new TimeInterval(2000);
    private _maxPlaybackDrift = new TimeInterval(1000);
    private _lastWaitPoint?: CoordinationWaitPoint;
    private initializeState: LiveDataObjectInitializeState =
        LiveDataObjectInitializeState.needed;

    // Broadcast events
    private _playEvent?: LiveEventTarget<ITransportCommandEvent>;
    private _pauseEvent?: LiveEventTarget<ITransportCommandEvent>;
    private _seekToEvent?: LiveEventTarget<ITransportCommandEvent>;
    private _setTrackEvent?: LiveEventTarget<ISetTrackEvent>;
    private _setTrackDataEvent?: LiveEventTarget<ISetTrackDataEvent>;
    private _positionUpdateEvent?: LiveEventTarget<IPositionUpdateEvent>;
    private _joinedEvent?: LiveEventTarget<undefined>;

    // Distributed state
    private _groupState?: GroupCoordinatorState;

    /**
     * @hidden
     * Applications shouldn't directly create new coordinator instances.
     */
    constructor(
        runtime: IRuntimeSignaler,
        liveRuntime: LiveShareRuntime,
        getPlayerState: () => IMediaPlayerState
    ) {
        super();
        this._runtime = runtime;
        this._liveRuntime = liveRuntime;
        this._logger = new LiveTelemetryLogger(runtime, liveRuntime);
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
     * Controls whether or not the local client is allowed to send position updates to the group.
     *
     * @remarks
     * This flag largely meant to limit the number of signals sent to the group for performance reasons.
     * It does not provide any security in itself.
     */
    public canSendPositionUpdates: boolean = true;

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
     *
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async play(): Promise<void> {
        LiveDataObjectNotInitializedError.assert(
            "LiveMediaSessionCoordinator:play",
            "play",
            this.initializeState
        );
        TrackMetadataNotSetError.assert(
            !!this._groupState?.playbackTrack.current.metadata,
            "LiveMediaSessionCoordinator:play",
            "play"
        );
        ActionBlockedError.assert(
            this.canPlayPause,
            "LiveMediaSessionCoordinator:play",
            "play",
            "canPlayPause"
        );

        // Get projected position
        const position = this.getPlayerPosition();

        // Send transport command
        this._logger.sendTelemetryEvent(
            TelemetryEvents.SessionCoordinator.PlayCalled,
            null,
            { position: position }
        );
        await this._playEvent!.sendEvent({
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
     *
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async pause(): Promise<void> {
        LiveDataObjectNotInitializedError.assert(
            "LiveMediaSessionCoordinator:pause",
            "pause",
            this.initializeState
        );
        TrackMetadataNotSetError.assert(
            !!this._groupState?.playbackTrack.current.metadata,
            "LiveMediaSessionCoordinator:pause",
            "pause"
        );
        ActionBlockedError.assert(
            this.canPlayPause,
            "LiveMediaSessionCoordinator:pause",
            "pause",
            "canPlayPause"
        );

        // Get projected position
        const position = this.getPlayerPosition();

        // Send transport command
        this._logger.sendTelemetryEvent(
            TelemetryEvents.SessionCoordinator.PauseCalled,
            null,
            { position: position }
        );
        await this._pauseEvent!.sendEvent({
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
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async seekTo(time: number): Promise<void> {
        LiveDataObjectNotInitializedError.assert(
            "LiveMediaSessionCoordinator:seekTo",
            "seekTo",
            this.initializeState
        );
        TrackMetadataNotSetError.assert(
            !!this._groupState?.playbackTrack.current.metadata,
            "LiveMediaSessionCoordinator:seekTo",
            "seekTo"
        );
        ActionBlockedError.assert(
            this.canSeek,
            "LiveMediaSessionCoordinator:seekTo",
            "seekTo",
            "canSeek"
        );

        // Send transport command
        this._logger.sendTelemetryEvent(
            TelemetryEvents.SessionCoordinator.SeekToCalled,
            null,
            { position: time }
        );
        try {
            await this._seekToEvent!.sendEvent({
                track: this._groupState.playbackTrack.current,
                position: time,
            });
        } catch (err) {
            await this._groupState!.syncLocalMediaSession();
            throw err;
        }
    }

    /**
     * Instructs the group to load a new track.
     *
     * @remarks
     * Throws an exception if the session/coordinator hasn't been initialized or `canSetTrack` is
     * false.
     * @param metadata The track to load or `null` to indicate that the end of the track is reached.
     * @param waitPoints Optional. List of static wait points to configure for the track.  Dynamic wait points can be added via the `beginSuspension()` call.
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async setTrack(
        metadata: ExtendedMediaMetadata | null,
        waitPoints?: CoordinationWaitPoint[]
    ): Promise<void> {
        LiveDataObjectNotInitializedError.assert(
            "LiveMediaSessionCoordinator:setTrack",
            "setTrack",
            this.initializeState
        );
        ActionBlockedError.assert(
            this.canSetTrack,
            "LiveMediaSessionCoordinator:setTrack",
            "setTrack",
            "canSetTrack"
        );

        // Send transport command
        this._logger.sendTelemetryEvent(
            TelemetryEvents.SessionCoordinator.SetTrackCalled
        );
        await this._setTrackEvent!.sendEvent({
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
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async setTrackData(data: object | null): Promise<void> {
        LiveDataObjectNotInitializedError.assert(
            "LiveMediaSessionCoordinator:setTrackData",
            "setTrackData",
            this.initializeState
        );
        ActionBlockedError.assert(
            this.canSetTrackData,
            "LiveMediaSessionCoordinator:setTrackData",
            "setTrackData",
            "canSetTrackData"
        );

        // Send transport command
        this._logger.sendTelemetryEvent(
            TelemetryEvents.SessionCoordinator.SetTrackDataCalled
        );
        await this._setTrackDataEvent!.sendEvent({
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
    public beginSuspension(
        waitPoint?: CoordinationWaitPoint
    ): MediaSessionCoordinatorSuspension {
        LiveDataObjectNotInitializedError.assert(
            "LiveMediaSessionCoordinator:beginSuspension",
            "beginSuspension",
            this.initializeState
        );
        TrackMetadataNotSetError.assert(
            !!this._groupState?.playbackTrack.current.metadata,
            "LiveMediaSessionCoordinator:beginSuspension",
            "beginSuspension"
        );

        // Tell group state that suspension is started
        if (waitPoint) {
            this._logger.sendTelemetryEvent(
                TelemetryEvents.SessionCoordinator.BeginSuspensionAndWait,
                null,
                {
                    position: waitPoint.position,
                    maxClients: waitPoint.maxClients,
                }
            );
            this._lastWaitPoint = waitPoint;
            this._groupState.beginSuspension(waitPoint);
        } else {
            this._logger.sendTelemetryEvent(
                TelemetryEvents.SessionCoordinator.BeginSuspension
            );
            this._groupState.beginSuspension();
        }

        // Return new suspension object
        return new LiveMediaSessionCoordinatorSuspension(waitPoint, (time) => {
            if (waitPoint) {
                this._logger.sendTelemetryEvent(
                    TelemetryEvents.SessionCoordinator.EndSuspensionAndWait,
                    null,
                    {
                        position: waitPoint.position,
                        maxClients: waitPoint.maxClients,
                    }
                );
            } else {
                this._logger.sendTelemetryEvent(
                    TelemetryEvents.SessionCoordinator.EndSuspension
                );
            }
            this._groupState!.endSuspension(time == undefined);
            if (
                time != undefined &&
                !this._groupState?.isSuspended &&
                !this._groupState?.isWaiting
            ) {
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
        return this.initializeState === LiveDataObjectInitializeState.succeeded;
    }

    /**
     * @hidden
     * Called by MediaSession to start coordinator.
     */
    public async initialize(
        acceptTransportChangesFrom?: UserMeetingRole[]
    ): Promise<void> {
        LiveDataObjectInitializeNotNeededError.assert(
            "LiveMediaSessionCoordinator:initialize",
            this.initializeState
        );
        this.initializeState = LiveDataObjectInitializeState.pending;

        try {
            // Create children
            await this.createChildren(acceptTransportChangesFrom);
        } catch (error: unknown) {
            this.initializeState = LiveDataObjectInitializeState.needed;
            throw error;
        }
        this.initializeState = LiveDataObjectInitializeState.succeeded;
    }

    /**
     * @hidden
     * Called by the MediaSession to detect if a wait point has been hit.
     */
    public findNextWaitPoint(): CoordinationWaitPoint | null {
        return (
            this._groupState?.playbackTrack.findNextWaitPoint(
                this._lastWaitPoint
            ) || null
        );
    }

    /**
     * @hidden
     * Called by MediaSession to trigger the sending of a position update.
     */
    public sendPositionUpdate(state: IMediaPlayerState): void {
        LiveDataObjectNotInitializedError.assert(
            "LiveMediaSessionCoordinator:sendPositionUpdate",
            "sendPositionUpdate",
            this.initializeState
        );

        if (this.canSendPositionUpdates) {
            // Send position update event
            const evt = this._groupState!.createPositionUpdateEvent(state);
            this._positionUpdateEvent?.sendEvent(evt).catch((err) => {
                this._logger.sendErrorEvent(
                    TelemetryEvents.SessionCoordinator.PositionUpdateEventError,
                    err
                );
            });
        } else {
            // make sure position is synced to position of clients who can send position updates
            this._groupState!.syncLocalMediaSession();
        }
    }

    protected async createChildren(
        acceptTransportChangesFrom?: UserMeetingRole[]
    ): Promise<void> {
        // Create event scopes
        const scope = new LiveEventScope(
            this._runtime,
            this._liveRuntime,
            acceptTransportChangesFrom
        );
        const unrestrictedScope = new LiveEventScope(
            this._runtime,
            this._liveRuntime
        );

        // Initialize internal coordinator state
        this._groupState = new GroupCoordinatorState(
            this._runtime,
            this._liveRuntime,
            this._maxPlaybackDrift,
            this._positionUpdateInterval,
            this._getPlayerState
        );
        this._groupState.on(GroupCoordinatorStateEvents.triggeraction, (evt) =>
            this.emit(evt.name, evt)
        );

        // Listen for track changes
        this._setTrackEvent = new LiveEventTarget<ISetTrackEvent>(
            scope,
            "setTrack",
            (event, local) => this._groupState!.handleSetTrack(event, local)
        );
        this._setTrackDataEvent = new LiveEventTarget<ISetTrackDataEvent>(
            scope,
            "setTrackData",
            (event, local) => this._groupState!.handleSetTrackData(event, local)
        );

        // Listen for transport commands
        this._playEvent = new LiveEventTarget(scope, "play", (event, local) =>
            this._groupState!.handleTransportCommand(event, local)
        );
        this._pauseEvent = new LiveEventTarget(scope, "pause", (event, local) =>
            this._groupState!.handleTransportCommand(event, local)
        );
        this._seekToEvent = new LiveEventTarget(
            scope,
            "seekTo",
            (event, local) =>
                this._groupState!.handleTransportCommand(event, local)
        );

        // Listen for position updates
        this._positionUpdateEvent = new LiveEventTarget(
            unrestrictedScope,
            "positionUpdate",
            (event, local) =>
                this._groupState!.handlePositionUpdate(event, local)
        );

        // Listen for joined event
        this._joinedEvent = new LiveEventTarget(
            unrestrictedScope,
            "joined",
            (evt, local) => {
                // Immediately send a position update
                this._logger.sendTelemetryEvent(
                    TelemetryEvents.SessionCoordinator.RemoteJoinReceived,
                    null,
                    {
                        correlationId: LiveTelemetryLogger.formatCorrelationId(
                            evt.clientId,
                            evt.timestamp
                        ),
                    }
                );
                try {
                    const state = this._getPlayerState();
                    this.sendPositionUpdate(state);
                } catch (err: any) {
                    // if player is not setup yet, local client might have also just joined and can't send its position.
                    const playerNotSetup =
                        isErrorLike(err) &&
                        err.message.includes(
                            "LiveMediaSession:getCurrentPlayerState"
                        );
                    if (!playerNotSetup) {
                        throw err;
                    }
                }
            }
        );
        // Send initial joined event
        this._joinedEvent?.sendEvent(undefined).catch((err) => {
            this._logger.sendErrorEvent(
                TelemetryEvents.SessionCoordinator.SendJoinedEventError,
                err
            );
        });
    }

    private getPlayerPosition(): number {
        const { positionState, playbackState } = this._getPlayerState();
        switch (playbackState) {
            case "none":
            case "ended":
                return 0.0;
            default:
                return positionState && positionState.position != undefined
                    ? positionState.position
                    : 0.0;
        }
    }
}
