/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */
import {
    LiveTelemetryLogger,
    ILiveEvent,
    IRuntimeSignaler,
} from "@microsoft/live-share";
import EventEmitter from "events";
import {
    ExtendedMediaSessionAction,
    ExtendedMediaSessionPlaybackState,
    ExtendedMediaMetadata,
    CoordinationWaitPoint,
    ExtendedMediaSessionActionDetails,
    MediaSessionCoordinatorEvents,
    MediaSessionCoordinatorSuspension,
} from "./MediaSessionExtensions";
import { VolumeManager } from "./VolumeManager";
import { LiveMediaSession } from "./LiveMediaSession";
import { IMediaPlayer } from "./IMediaPlayer";
import { ITriggerActionEvent, TelemetryEvents } from "./internals";
import { waitUntilConnected } from "@microsoft/live-share/bin/internals";

/**
 * Event data returned by `MediaPlayerSynchronizer` object.
 */
export interface IMediaPlayerSynchronizerEvent extends ILiveEvent {
    /**
     * Event details.
     */
    details: ExtendedMediaSessionActionDetails;
    /**
     * Action errors, including DOMException errors thrown by HTMLMediaElement
     */
    error?: Error;
}

/**
 * Events supported by `MediaPlayerSynchronizer` object.
 */
export enum MediaPlayerSynchronizerEvents {
    /**
     *
     */
    coordinatorstatechange = "coordinatorstatechange",
    groupaction = "groupaction",
    useraction = "useraction",
}

/**
 * Synchronizes a local HTML Media Element with a group of remote HTML Media Elements.
 *
 * @remarks
 * All of an apps transport control commands should be routed through the synchronizer. If the
 * app is not currently joined to the group media session, the commands will be applied directly
 * to the local player. When the group session is joined the commands will be broadcast to the
 * group in addition to being applied to the local player.
 */
export class MediaPlayerSynchronizer extends EventEmitter {
    private static SESSION_ACTIONS: ExtendedMediaSessionAction[] = [
        "play",
        "pause",
        "seekto",
        "settrack",
        "ratechange",
        "datachange",
        "catchup",
        "wait",
    ];
    private static PLAYER_EVENTS: string[] = [
        "playing",
        "pause",
        "ratechange",
        "timeupdate",
        "ended",
        "loadedmetadata",
        "blocked",
    ];

    private _logger: LiveTelemetryLogger;
    private _player: IMediaPlayer;
    private _mediaSession: LiveMediaSession;
    private _runtime: IRuntimeSignaler;
    private _volumeManager: VolumeManager;
    private _onEnd?: () => void;
    private _onPlayerEvent: EventListener;
    private _seekSuspension?: MediaSessionCoordinatorSuspension;
    private _viewOnly = false;
    private _blockUnexpectedPlayerEvents = true;
    private _expectedPlaybackState: ExtendedMediaSessionPlaybackState = "none";
    private _expectedPlaybackRate: number = 1.0;
    private _metadata: ExtendedMediaMetadata | null = null;
    private _trackData: object | null = null;

    /**
     * Creates a new `MediaElementSynchronizer` instance.
     * @param player Media player element. This can be an HTML Media Element or any player that looks like an HTML Media Element.
     * @param mediaSession Group MediaSession object being used.
     * @param onEnd Optional. Function to call when synchronizers `end()` method is called.
     */
    constructor(
        player: IMediaPlayer,
        mediaSession: LiveMediaSession,
        runtime: IRuntimeSignaler,
        onEnd: () => void
    ) {
        super();
        this._player = player;
        this._mediaSession = mediaSession;
        this._runtime = runtime;
        this._logger = mediaSession.logger;
        this._volumeManager = new VolumeManager(player);
        this._onEnd = onEnd;

        // Listen for player state requests
        mediaSession.setRequestPlayerStateHandler(() => {
            // Find playback state
            let playbackState: ExtendedMediaSessionPlaybackState;
            const src = this._player.currentSrc || this._player.src;
            if (this._player.ended) {
                playbackState = "ended";
            } else if (
                !src ||
                (this._player.paused && this._player.currentTime < 1.0)
            ) {
                playbackState = "none";
            } else if (this._player.paused) {
                playbackState = "paused";
            } else {
                playbackState = "playing";
            }

            // Metadata equality check in `GroupPlaybackTrack` would return false if only providing src.
            // Use full metadata if this._metadata has same src
            const metadata =
                this._metadata && this._metadata.trackIdentifier === src
                    ? this._metadata
                    : ({ trackIdentifier: src } as ExtendedMediaMetadata);

            const state = {
                metadata: metadata,
                playbackState: playbackState,
                positionState: {
                    position: this._player.currentTime,
                    playbackRate: this._player.playbackRate ?? 1,
                    duration: this._player.duration,
                },
                trackData: this._trackData,
            };

            return state;
        });

        // Listen for player events
        this._onPlayerEvent = (evt: Event) => {
            if (evt.type != "timeupdate") {
                this._logger.sendTelemetryEvent(
                    TelemetryEvents.MediaPlayerSynchronizer.PlayerEvent,
                    null,
                    {
                        type: evt.type,
                    }
                );
            }

            switch (evt.type) {
                case "loadedmetadata":
                    // eslint-disable-next-line no-case-declarations
                    const src = this._player.currentSrc || this._player.src;
                    this._trackData = null;
                    break;
                case "playing":
                    // Handle case for YouTube player where user can pause/play video by clicking on it.
                    // - Videos don't always start at 0.0 seconds.
                    if (
                        this._blockUnexpectedPlayerEvents &&
                        this._expectedPlaybackState != "playing"
                    ) {
                        if (
                            this._mediaSession.coordinator.canPlayPause &&
                            this._player.currentTime < 1.0
                        ) {
                            this._logger.sendTelemetryEvent(
                                TelemetryEvents.MediaPlayerSynchronizer
                                    .UserTappedVideoToPlay
                            );
                            this.play().catch((err) => {
                                this._logger.sendErrorEvent(
                                    TelemetryEvents.MediaPlayerSynchronizer
                                        .UserTappedVideoToPlayError,
                                    err
                                );
                            });
                        }
                    }
                    // block play if player state is playing when expected synced state is paused and coordinator is not suspended.
                    // needed because cannot tell if its a user initiated event, so disallow play
                    if (
                        this._blockUnexpectedPlayerEvents &&
                        this._expectedPlaybackState === "paused" &&
                        !this._mediaSession.coordinator.isSuspended
                    ) {
                        this._player.pause();
                    }

                    // block play if player state is playing when expected synced state is none and coordinator is not suspended.
                    // needed because user who is not in control should not be able to start, so disallow play
                    if (
                        this._blockUnexpectedPlayerEvents &&
                        this._expectedPlaybackState === "none" &&
                        !this._mediaSession.coordinator.isSuspended
                    ) {
                        this._player.pause();
                    }
                    break;
                case "pause":
                    // block pause if player state is paused when expected synced state is playing and coordinator is not suspended.
                    // needed because cannot tell if its a user initiated event, so disallow pause
                    if (
                        this._blockUnexpectedPlayerEvents &&
                        this._expectedPlaybackState === "playing" &&
                        !this._mediaSession.coordinator.isSuspended &&
                        // some players have ended, but emit a pause event immediately before ended event. Do not play if ended
                        !this._player.ended
                    ) {
                        this._player.play();
                    }
                    break;
                case "ratechange":
                    if (
                        this._blockUnexpectedPlayerEvents &&
                        this._expectedPlaybackRate !==
                            this._player.playbackRate &&
                        !this._mediaSession.coordinator.isSuspended
                    ) {
                        this._player.playbackRate = this._expectedPlaybackRate;
                    }
                    break;
                case "blocked":
                    this._logger.sendTelemetryEvent(
                        TelemetryEvents.MediaPlayerSynchronizer
                            .PlayerBlockedOperation
                    );
                    break;
            }
        };

        // Register for coordinator state changes
        this._mediaSession.coordinator.on(
            MediaSessionCoordinatorEvents.coordinatorstatechange,
            (evt) => this.emit(evt.type, evt)
        );

        this._mediaSession.coordinator.on(
            MediaSessionCoordinatorEvents.triggeractionignored,
            (evt: ITriggerActionEvent) => {
                this.dispatchGroupAction(evt.details, undefined);
            }
        );

        // Register media session actions
        for (const action of MediaPlayerSynchronizer.SESSION_ACTIONS) {
            this._mediaSession.setActionHandler(
                action,
                async (details: ExtendedMediaSessionActionDetails) => {
                    let error: Error | undefined;
                    try {
                        switch (details.action) {
                            case "play":
                                this._expectedPlaybackState = "playing";
                                if (this._player.paused) {
                                    this._logger.sendTelemetryEvent(
                                        TelemetryEvents.MediaPlayerSynchronizer
                                            .PlayAction
                                    );
                                    if (
                                        typeof details.seekTime == "number" &&
                                        this._player.currentTime < 1.0
                                    ) {
                                        this._logger.sendTelemetryEvent(
                                            TelemetryEvents
                                                .MediaPlayerSynchronizer
                                                .SeekingPlayerToStartPosition,
                                            null,
                                            { position: details.seekTime }
                                        );
                                        this._player.currentTime =
                                            details.seekTime!;
                                    }
                                    // Reference: https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/play#exceptions
                                    await this._player.play();
                                }
                                break;
                            case "pause":
                                this._logger.sendTelemetryEvent(
                                    TelemetryEvents.MediaPlayerSynchronizer
                                        .PauseAction
                                );
                                this._expectedPlaybackState = "paused";
                                if (
                                    typeof details.seekTime == "number" &&
                                    this._player.currentTime < 1.0
                                ) {
                                    this._logger.sendTelemetryEvent(
                                        TelemetryEvents.MediaPlayerSynchronizer
                                            .SeekingPlayerToStartPosition,
                                        null,
                                        { position: details.seekTime }
                                    );
                                    this._player.currentTime =
                                        details.seekTime!;
                                }
                                this._player.pause();
                                break;
                            case "seekto":
                                if (typeof details.seekTime == "number") {
                                    this._logger.sendTelemetryEvent(
                                        TelemetryEvents.MediaPlayerSynchronizer
                                            .SeekToAction,
                                        null,
                                        { position: details.seekTime }
                                    );
                                    this._player.currentTime =
                                        details.seekTime!;
                                }
                                break;
                            case "settrack":
                                this._logger.sendTelemetryEvent(
                                    TelemetryEvents.MediaPlayerSynchronizer
                                        .SetTrackAction
                                );
                                this._expectedPlaybackState = "none";
                                this._metadata = details.metadata ?? null;
                                if (
                                    this._player.src ===
                                    details.metadata?.trackIdentifier
                                ) {
                                    // Don't set duplicate src and load again.
                                    break;
                                }
                                this._player.src =
                                    details.metadata!.trackIdentifier;
                                this._player.load();
                                break;
                            case "datachange":
                                this._logger.sendTelemetryEvent(
                                    TelemetryEvents.MediaPlayerSynchronizer
                                        .DataChangeAction
                                );
                                break;
                            case "ratechange":
                                if (!details.playbackRate) {
                                    break;
                                }

                                this._logger.sendTelemetryEvent(
                                    TelemetryEvents.MediaPlayerSynchronizer
                                        .RateChangeAction,
                                    null,
                                    { playbackRate: details.playbackRate }
                                );
                                this._expectedPlaybackRate =
                                    details.playbackRate;
                                this._player.playbackRate =
                                    details.playbackRate;
                                break;
                            case "catchup":
                                if (typeof details.seekTime == "number") {
                                    this._logger.sendTelemetryEvent(
                                        TelemetryEvents.MediaPlayerSynchronizer
                                            .CatchupAction,
                                        null,
                                        { position: details.seekTime }
                                    );
                                    this.catchupPlayer(details.seekTime!);
                                }
                                break;
                        }
                    } catch (err: any) {
                        if (err instanceof Error) {
                            error = err;
                        } else {
                            error = new Error(
                                err?.message ??
                                    "An unknown error occurred after processing the group session action."
                            );
                        }
                    }

                    this.dispatchGroupAction(details, error);
                }
            );
        }

        // Subscribe to player events
        for (const event of MediaPlayerSynchronizer.PLAYER_EVENTS) {
            this._player.addEventListener(event, this._onPlayerEvent);
        }

        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.SynchronizationStarted
        );
    }

    /**
     * Media player being synchronized.
     */
    public get player(): IMediaPlayer {
        return this._player;
    }

    /**
     * Synchronizers media session.
     */
    public get mediaSession(): LiveMediaSession {
        return this._mediaSession;
    }

    /**
     * If true the client is in a view only mode.
     *
     * @remarks
     * Toggling this value to true results in `mediaSession.coordinator.canPlayPause`,
     * `mediaSession.coordinator.canSeek`, `mediaSession.coordinator.canSetTrack`,
     * `mediaSession.coordinator.canSetTrackData`, and `mediaSession.coordinator.canSetPlaybackRate`
     *  all being set to false.  For more fine grained control over the local clients policies,
     *  call the `mediaSession.coordinator` directly.
     */
    public get viewOnly(): boolean {
        return this._viewOnly;
    }

    public set viewOnly(value: boolean) {
        this._viewOnly = value;
        this.mediaSession.coordinator.canPlayPause = !value;
        this.mediaSession.coordinator.canSeek = !value;
        this.mediaSession.coordinator.canSetTrack = !value;
        this.mediaSession.coordinator.canSetTrackData = !value;
        this.mediaSession.coordinator.canSetPlaybackRate = !value;
    }

    /**
     * @beta
     * If true, pause and play actions will be ignored unless explicitly invoked from the corresponding play() and pause() functions.
     *
     * @remarks
     * True is considered non-beta. If you set to false, this is an experimental beta behavior.
     * Setting it to false may cause unintended side effects, such as local buffer events sending a pause event to remote clients.
     * While setting this to false may prevent the need to add custom media controls for frameworks like video.js, we encourage you to be mindful of this and test thoroughly before using this setting.
     */
    public get blockUnexpectedPlayerEvents(): boolean {
        return this._blockUnexpectedPlayerEvents;
    }

    public set blockUnexpectedPlayerEvents(value: boolean) {
        this._blockUnexpectedPlayerEvents = value;
    }

    /**
     * Volume limiter used to temporarily reduce the videos volume when someone speaks in a meeting.
     */
    public get volumeManager(): VolumeManager {
        return this._volumeManager;
    }

    /**
     * Registers a new event listener.
     * @param event Name of the event to add.
     * @param listener Function to call when the event is triggered.
     */
    public addEventListener(
        event: MediaPlayerSynchronizerEvents,
        listener: (evt: IMediaPlayerSynchronizerEvent) => void
    ): this {
        this.on(event, listener);
        return this;
    }

    /**
     * Un-registers an existing event listener.
     * @param event Name of the event to remove.
     * @param listener Function that was registered in call to `addEventListener()`.
     */
    public removeEventListener(
        event: MediaPlayerSynchronizerEvents,
        listener: (evt: IMediaPlayerSynchronizerEvent) => void
    ): this {
        this.off(event, listener);
        return this;
    }

    /**
     * Ends synchronization of the current media player.
     */
    public end(): void {
        if (this._onEnd) {
            try {
                // Clear media session actions
                for (const action of MediaPlayerSynchronizer.SESSION_ACTIONS) {
                    this._mediaSession.setActionHandler(action, null);
                }

                // Subscribe to player events
                for (const event of MediaPlayerSynchronizer.PLAYER_EVENTS) {
                    this._player.removeEventListener(
                        event,
                        this._onPlayerEvent
                    );
                }

                // Notify parent
                this._onEnd();
            } finally {
                this._onEnd = undefined;
            }
        }
    }

    /**
     * Begin a local seek operation.
     *
     * @remarks
     * UI can call this when a user grabs a timeline scrubber and starts scrubbing the video to a
     * new playback position. The synchronizer will being a new suspension which temporarily
     * disconnects the client for the rest of the group for synchronization purposes. Calling
     * `endSeek()` will end the suspension and seek the group to the users final seek position.
     */
    public beginSeek(): void {
        if (this._seekSuspension) {
            throw new Error(
                "MediaPlayerSynchronizer:beginSeek - cannot begin seek since a seek is already in progress.\nTo prevent this error, ensure you first call `endSeek()` before calling `beginSeek()` again."
            );
        }

        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.BeginSeekCalled
        );
        this._seekSuspension = this._mediaSession.coordinator.beginSuspension();
    }

    /**
     * Ends a seek operation that was started by calling `beginSeek()`.
     * @param seekTo Playback position in seconds to seek the group to.
     */
    public endSeek(seekTo: number): void {
        if (!this._seekSuspension) {
            throw new Error(
                "MediaPlayerSynchronizer:endSeek - cannot end seek while no seek is in progress.\nTo prevent this error, ensure you first call `beginSeek()`."
            );
        }

        // Seek player to new time immediately.
        // - This resolves an issue where the timeline scrubber can temporarily snap back to the original
        //   location.
        this._player.currentTime = seekTo;

        const suspension = this._seekSuspension;
        this._seekSuspension = undefined;

        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.EndSeekCalled,
            null,
            {
                position: seekTo,
            }
        );
        suspension.end(seekTo);

        waitUntilConnected(this._runtime).then((clientId: string) => {
            this.dispatchUserAction({
                action: "seekto",
                source: "user",
                clientId,
                local: true,
                seekTime: seekTo,
            });
        });
    }

    /**
     * Tells the group to begin playing the current video.
     *
     * @remarks
     * For proper operation apps should avoid calling `mediaSession.coordinator.play()` directly
     * and instead use the synchronizers `play()` method.
     *
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async play(): Promise<void> {
        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.PlayCalled
        );
        this._expectedPlaybackState = "playing";
        await this._mediaSession.coordinator.play();

        this.dispatchUserAction({
            action: "play",
            source: "user",
            clientId: await waitUntilConnected(this._runtime),
            local: true,
        });
    }

    /**
     * Tells the group to pause the current video.
     *
     * @remarks
     * For proper operation apps should avoid calling `mediaSession.coordinator.pause()` directly
     * and instead use the synchronizers `pause()` method.
     *
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async pause(): Promise<void> {
        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.PauseCalled
        );
        this._expectedPlaybackState = "paused";
        await this._mediaSession.coordinator.pause();

        this.dispatchUserAction({
            action: "pause",
            source: "user",
            clientId: await waitUntilConnected(this._runtime),
            local: true,
        });
    }

    /**
     * Tells the group to seek the current video to a new playback position.
     *
     * @remarks
     * For proper operation apps should avoid calling `mediaSession.coordinator.seekTo()` directly
     * and instead use the synchronizers `seekTo()` method.
     *
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async seekTo(time: number): Promise<void> {
        // Always seek player to new time.
        // - This resolves an issue where the timeline scrubber can temporarily snap back to the original
        //   location.
        this._player.currentTime = time;

        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.SeekToCalled,
            null,
            { position: time }
        );
        await this._mediaSession.coordinator.seekTo(time);

        this.dispatchUserAction({
            action: "seekto",
            source: "user",
            clientId: await waitUntilConnected(this._runtime),
            seekTime: time,
            local: true,
        });
    }

    public async setPlaybackRate(playbackRate: number): Promise<void> {
        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.RateChangeAction,
            null,
            { playbackRate }
        );

        await this._mediaSession.coordinator.setPlaybackRate(playbackRate);

        this.dispatchUserAction({
            action: "ratechange",
            source: "user",
            clientId: await waitUntilConnected(this._runtime),
            local: true,
            playbackRate,
        });
    }

    /**
     * Tells the group to change to a new track.
     *
     * @remarks
     * For proper operation apps should avoid calling `mediaSession.coordinator.setTrack()` directly
     * and instead use the synchronizers `setTrack()` method.
     *
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async setTrack(
        track: ExtendedMediaMetadata,
        waitPoints?: CoordinationWaitPoint[]
    ): Promise<void> {
        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.SetTrackCalled
        );
        await this._mediaSession.coordinator.setTrack(track, waitPoints);

        this.dispatchUserAction({
            action: "settrack",
            source: "user",
            clientId: await waitUntilConnected(this._runtime),
            metadata: track,
            local: true,
        });
    }

    /**
     * Updates the current tracks data object.
     *
     * @remarks
     * For proper operation apps should avoid calling `mediaSession.coordinator.setTrackData()` directly
     * and instead use the synchronizers `setTrackData()` method.
     *
     * @returns a void promise that resolves once complete, throws if user does not have proper roles
     */
    public async setTrackData(data: object | null): Promise<void> {
        this._logger.sendTelemetryEvent(
            TelemetryEvents.MediaPlayerSynchronizer.SetTrackDataCalled
        );
        this._trackData = data;
        await this._mediaSession.coordinator.setTrackData(data);

        this.dispatchUserAction({
            action: "datachange",
            source: "user",
            clientId: await waitUntilConnected(this._runtime),
            local: true,
            data: data,
        });
    }

    private dispatchGroupAction(
        details: ExtendedMediaSessionActionDetails,
        error: Error | undefined
    ): void {
        this.emit(MediaPlayerSynchronizerEvents.groupaction, {
            type: MediaPlayerSynchronizerEvents.groupaction,
            details: details,
            error,
        });
    }

    private dispatchUserAction(
        details: ExtendedMediaSessionActionDetails
    ): void {
        this.emit(MediaPlayerSynchronizerEvents.useraction, {
            type: MediaPlayerSynchronizerEvents.useraction,
            details: details,
        });
    }

    private async catchupPlayer(time: number): Promise<void> {
        this._player.currentTime = time;
    }
}
