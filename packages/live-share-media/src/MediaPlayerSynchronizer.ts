/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EphemeralTelemetryLogger, IEvent, TimeInterval } from '@microsoft/live-share';
import EventEmitter from 'events';
import { ExtendedMediaSessionAction, ExtendedMediaSessionPlaybackState, ExtendedMediaMetadata, CoordinationWaitPoint, ExtendedMediaSessionActionDetails, MediaSessionCoordinatorEvents, MediaSessionCoordinatorSuspension } from './MediaSessionExtensions';
import { EphemeralMediaSession } from './EphemeralMediaSession';
import { VolumeLimiter } from './VolumeLimiter';
import { IMediaPlayer } from './IMediaPlayer';
import { TelemetryEvents } from './internals';

export interface IMediaPlayerSynchronizerEvent extends IEvent {
    details: ExtendedMediaSessionActionDetails;
}

export enum MediaPlayerSynchronizerEvents {
    coordinatorstatechange = 'coordinatorstatechange',
    groupaction = 'groupaction',
    useraction = 'useraction'
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
    private static SESSION_ACTIONS: ExtendedMediaSessionAction[] = ['play', 'pause', 'seekto', 'settrack', 'datachange', 'catchup', 'wait'];
    private static PLAYER_EVENTS: string[] = ['playing', 'pause', 'ratechange', 'timeupdate', 'ended', 'loadedmetadata', 'blocked'];

    private _logger: EphemeralTelemetryLogger;
    private _player: IMediaPlayer;
    private _mediaSession: EphemeralMediaSession;
    private _volumeLimiter: VolumeLimiter;
    private _onEnd?: () => void;
    private _onPlayerEvent: EventListener;
    private _catchupFastSeekPeriod: TimeInterval = new TimeInterval(0);
    private _seekSuspension?: MediaSessionCoordinatorSuspension;
    private _viewOnly = false;
    private _expectedPlaybackState: ExtendedMediaSessionPlaybackState = 'none';
    private _trackData: object|null = null;

    /**
     * Creates a new `MediaElementSynchronizer` instance.
     * @param player Media player element. This can be an HTML Media Element or any player that looks like an HTML Media Element.
     * @param mediaSession Group MediaSession object being used.
     * @param onEnd Optional. Function to call when synchronizers `end()` method is called.
     */
    constructor(player: IMediaPlayer, mediaSession: EphemeralMediaSession, onEnd: () => void) {
        super();
        this._player = player;
        this._mediaSession = mediaSession;
        this._logger = mediaSession.logger;
        this._volumeLimiter = new VolumeLimiter(player);
        this._onEnd = onEnd;

        // Listen for player state requests
        mediaSession.setRequestPlayerStateHandler(() => {
            // Find playback state
            let playbackState: ExtendedMediaSessionPlaybackState;
            const src = this._player.currentSrc || this._player.src;
            if (this._player.ended) {
                playbackState = 'ended';
            } else if (!src || (this._player.paused && this._player.currentTime < 1.0)) {
                playbackState = 'none';
            } else if (this._player.paused) {
                playbackState = 'paused';
            } else {
                playbackState = 'playing';
            }

            const state = {
                metadata: { trackIdentifier: src } as ExtendedMediaMetadata,
                playbackState: playbackState,
                positionState: {
                    position: this._player.currentTime,
                    playbackRate: this._player.playbackRate,
                    duration: this._player.duration
                },
                trackData: this._trackData
            };

            return state;
        });

        // Listen for player events
        this._onPlayerEvent = (evt: Event) => {
            if (evt.type != 'timeupdate') {
                this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.PlayerEvent, null, {type: evt.type});
            }

            switch (evt.type) {
                case 'loadedmetadata':
                    const src = this._player.currentSrc || this._player.src;
                    this._trackData = null;
                    break;
                case 'playing':
                    // Handle case for YouTube player where user can pause/play video by clicking on it.
                    // - Videos don't always start at 0.0 seconds.
                    if (this._expectedPlaybackState != 'playing') {
                        if (!this._viewOnly && this._player.currentTime < 1.0) {
                            this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.UserTappedVideoToPlay);
                            this.play();
                        }
                    }
                    break;
                case 'ratechange':
                    // Block rate changes unless suspended.
                    if (this._player.playbackRate != 1.0 && !this._mediaSession.coordinator.isSuspended) {
                        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.PlaybackRateChangeBlocked);
                        this._player.playbackRate = 1.0;
                    }
                    break;
                case 'blocked':
                    this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.PlaybackRateChangeBlocked);
                    break;
            }
        };

        // Register for coordinator state changes
        this._mediaSession.coordinator.on(MediaSessionCoordinatorEvents.coordinatorstatechange, evt => this.emit(evt.type, evt));

        // Register media session actions
        for (const action of MediaPlayerSynchronizer.SESSION_ACTIONS) {
            this._mediaSession.setActionHandler(action, (details: ExtendedMediaSessionActionDetails) => {
                switch (details.action) {
                    case 'play':
                        this._expectedPlaybackState = 'playing';
                        if (this._player.paused) {
                            this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.PlayAction);
                            if (typeof details.seekTime == 'number' && this._player.currentTime < 1.0) {
                                this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SeekingPlayerToStartPosition, null, {position: details.seekTime})
                                this._player.currentTime = details.seekTime!;
                            }
                            this._player.play();
                        }
                        break;
                    case 'pause':
                        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.PauseAction);
                        this._expectedPlaybackState = 'paused';
                        if (typeof details.seekTime == 'number' && this._player.currentTime < 1.0) {
                            this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SeekingPlayerToStartPosition, null, {position: details.seekTime})
                            this._player.currentTime = details.seekTime!;
                        }
                        this._player.pause();
                        break;
                    case 'seekto':
                        if (typeof details.seekTime == 'number') {
                            this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SeekToAction, null, {position: details.seekTime});
                            this._player.currentTime = details.seekTime!;
                        }
                        break;
                    case 'settrack':
                        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SetTrackAction);
                        this._expectedPlaybackState = 'none';
                        this._player.src = details.metadata!.trackIdentifier;
                        this._player.load();
                        break;
                    case 'datachange':
                        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.DataChangeAction);
                        break;
                    case 'catchup':
                        if (typeof details.seekTime == 'number') {
                            this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.CatchupAction, null, {position: details.seekTime});
                            this.catchupPlayer(details.seekTime!);
                        }
                        break;
                }

                this.dispatchGroupAction(details);
            });
        }

        // Subscribe to player events
        for (const event of MediaPlayerSynchronizer.PLAYER_EVENTS) {
            this._player.addEventListener(event, this._onPlayerEvent);
        }

        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SynchronizationStarted);
    }

    public get catchupFastSeekPeriod(): number {
        return this._catchupFastSeekPeriod.seconds;
    }

    public set catchupFastSeekPeriod(value: number) {
        this._catchupFastSeekPeriod.seconds = value;
    }

    public get player(): IMediaPlayer {
        return this._player;
    }

    public get mediaSession(): EphemeralMediaSession {
        return this._mediaSession;
    }

    public get viewOnly(): boolean {
        return this._viewOnly;
    }

    public set viewOnly(value: boolean) {
        this._viewOnly = value;
        this.mediaSession.coordinator.canPlayPause = !value;
        this.mediaSession.coordinator.canSeek = !value;
    }

    public get volumeLimiter(): VolumeLimiter {
        return this._volumeLimiter;
    }

    public addEventListener(event: MediaPlayerSynchronizerEvents, listener: () => void): this {
        this.on(event, listener);
        return this;
    }

    public removeEventListener(event: MediaPlayerSynchronizerEvents, listener: () => void): this {
        this.off(event, listener);
        return this;
    }

    public end(): void {
        if (this._onEnd) {
            try {
                // Clear media session actions
                for (const action of MediaPlayerSynchronizer.SESSION_ACTIONS) {
                    this._mediaSession.setActionHandler(action, null);
                }

                // Subscribe to player events
                for (const event of MediaPlayerSynchronizer.PLAYER_EVENTS) {
                    this._player.removeEventListener(event, this._onPlayerEvent);
                }

                // Notify parent
                this._onEnd();
            } finally {
                this._onEnd = undefined;
            }
        }
    }

    public beginSeek(): void {
        if (this._seekSuspension) {
            throw new Error(`MediaPlayerSynchronizer: cannot begin seek. A seek is already in progress.`);
        }

        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.BeginSeekCalled);
        this._seekSuspension = this._mediaSession.coordinator.beginSuspension();
    }

    public endSeek(seekTo: number): void {
        if (!this._seekSuspension) {
            throw new Error(`MediaPlayerSynchronizer: cannot end seek. No seek is in progress.`);
        }

        // Seek player to new time immediately.
        // - This resolves an issue where the timeline scrubber can temporarily snap back to the original
        //   location.
        this._player.currentTime = seekTo;

        const suspension = this._seekSuspension;
        this._seekSuspension = undefined;

        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.EndSeekCalled, null, {position: seekTo});
        suspension.end(seekTo);

        this.dispatchUserAction({action: 'seekto', seekTime: seekTo});
    }

    public play(): void {
        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.PlayCalled);
        this._expectedPlaybackState = 'playing';
        this._mediaSession.coordinator.play();

        this.dispatchUserAction({action: 'play'});
    }

    public pause(): void {
        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.PauseCalled);
        this._expectedPlaybackState = 'paused';
        this._mediaSession.coordinator.pause();

        this.dispatchUserAction({action: 'pause'});
    }

    public seekTo(time: number): void {
        // Always seek player to new time.
        // - This resolves an issue where the timeline scrubber can temporarily snap back to the original
        //   location.
        this._player.currentTime = time;

        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SeekToCalled, null, {position: time});
        this._mediaSession.coordinator.seekTo(time);

        this.dispatchUserAction({action: 'seekto', seekTime: time});
    }

    public setTrack(track: ExtendedMediaMetadata, waitPoints?: CoordinationWaitPoint[]): void {
        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SetTrackCalled);
        this._mediaSession.coordinator.setTrack(track, waitPoints);

        this.dispatchUserAction({action: 'settrack', metadata: track});
    }

    public setTrackData(data: object|null): void {
        this._logger.sendTelemetryEvent(TelemetryEvents.MediaPlayerSynchronizer.SetTrackDataCalled);
        this._trackData = data;
        this._mediaSession.coordinator.setTrackData(data);

        this.dispatchUserAction({action: 'datachange', data: data});
    }

    private dispatchGroupAction(details: ExtendedMediaSessionActionDetails, delay = false): void {
        if (delay) {
            setTimeout(() => this.emit(MediaPlayerSynchronizerEvents.groupaction, {type: MediaPlayerSynchronizerEvents.groupaction, details: details}), 50);
        } else {
            this.emit(MediaPlayerSynchronizerEvents.groupaction, {type: MediaPlayerSynchronizerEvents.groupaction, details: details});
        }
    }

    private dispatchUserAction(details: ExtendedMediaSessionActionDetails, delay = false): void {
        if (delay) {
            setTimeout(() => this.emit(MediaPlayerSynchronizerEvents.useraction, {type: MediaPlayerSynchronizerEvents.useraction, details: details}), 50);
        } else {
            this.emit(MediaPlayerSynchronizerEvents.useraction, {type: MediaPlayerSynchronizerEvents.useraction, details: details});
        }
    }

    private async catchupPlayer(time: number): Promise<void> {
        // Only fast seek if:
        // - more then 2 seconds behind.
        // - fast seek hasn't been disabled.
        // - the current playback rate is 1.0.
        if (time >= (this._player.currentTime + 2.0) && this.catchupFastSeekPeriod > 0 && this._player.playbackRate == 1.0) {
            // Fast seek to new position
            const suspension = await this._mediaSession.coordinator.beginSuspension();
            const seekPeriod = Math.min(time - this._player.currentTime, this.catchupFastSeekPeriod);
            const startTime = time - seekPeriod;
            this._player.currentTime = startTime;
            this._player.playbackRate = 4.0;
            setTimeout(async () => {
                this._player.playbackRate = 1.0;
                await suspension.end();
            }, (seekPeriod * 0.25) * 1000)
        } else {
            this._player.currentTime = time;
        }
    }
}