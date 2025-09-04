/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isErrorLike } from "@microsoft/live-share/internal";
import Component from "video.js/dist/types/component";
import Player from "video.js/dist/types/player";

const BlockDetectionState = {
    unknown: "unknown",
    detecting: "detecting",
    unblocked: "unblocked",
};

const PlayerEvent = {
    playing: "playing",
    play: "play",
    pause: "pause",
    rateChange: "ratechange",
    timeUpdate: "timeupdate",
    ended: "ended",
    loadedMetadata: "loadedmetadata",
    loadedData: "loadeddata",
    stalled: "stalled",
    blocked: "blocked",
    volumeChange: "volumechange",
    durationChange: "durationchange",
    ready: "ready",
    seeked: "seeked",
    seeking: "seeking",
    waiting: "waiting",
    canPlayThrough: "canplaythrough",
    canPlay: "canplay",
    emptied: "emptied",
    error: "error",
    abort: "abort",
    suspend: "suspend",
    progress: "progress",
    loadStart: "loadstart",
};

declare global {
    interface Window {
        amp: any; // turn off type checking
    }
}

interface TrackState {
    started: boolean;
    ended: boolean;
    error?: any;
    loaded: boolean;
    paused: boolean;
    playing: boolean;
    src: string;
    lastPosition: number;
    lastPositionCheck: number;
    skipTo?: {
        timeAdded: number;
        position: number;
    };
    autoPause: boolean;
}

/**
 * Class for VideoJSDelegate HTML shiv for compatibility with `MediaSynchronizer`.
 * If your media player's interface doesn't follow the HTML interface, this example
 * will help show how to create a thin wrapper around your player to make it function
 * exactly like an HTML5 media element so the `MediaSynchronizer` can properly wire
 * up `LiveMediaSession` action handlers.
 */
export class VideoJSDelegate extends EventTarget {
    _player: Player;

    // Position tracking
    _positionTimer: NodeJS.Timeout | undefined;

    // Track state
    _track = emptyTrackState("");
    _blockedState = BlockDetectionState.unknown;

    // If browser blocks initial play event due to autoplay policy
    // we mute and try again
    _autoplayPolicyChecked = false;

    constructor(player: Player) {
        super();
        this._player = player;
        this._startPositionTracker();
        Object.entries(PlayerEvent).forEach(([_, value]) => {
            this._player.on(value, this._onStateChangeEvent.bind(this));
        });
    }

    //---------------------------------------------------------------------------------------------
    // Player Source
    //---------------------------------------------------------------------------------------------
    get currentSrc(): string {
        return this._track.src;
    }
    get src(): string {
        return this._track.src;
    }
    /**
     * @param {src} value
     */
    set src(value: string) {
        if (this._track.src !== value) {
            this._track = emptyTrackState(value);
        }
    }

    //---------------------------------------------------------------------------------------------
    // Ready state
    //---------------------------------------------------------------------------------------------

    get readyState(): number {
        return this._player.readyState();
    }

    get seeking(): boolean {
        return false;
    }

    //---------------------------------------------------------------------------------------------
    // Playback state
    //---------------------------------------------------------------------------------------------

    get currentTime(): number {
        return this._player.currentTime() || 0;
    }

    /**
     * @param {number} value timestamp in seconds
     */
    set currentTime(value: number) {
        this._player.currentTime(value);
    }

    get duration(): number {
        return this._player.duration() || 0;
    }

    get paused(): boolean {
        return this._player.paused();
    }

    get playbackRate(): number {
        return this._player.playbackRate() || 1;
    }

    /**
     * @param {number} value (e.g., 1.0)
     */
    set playbackRate(value: number) {
        this._player.playbackRate(value);
    }

    get ended(): boolean {
        return this._player.ended();
    }

    get autoplay(): boolean {
        return this._player.autoplay() !== false;
    }

    /**
     * @param {boolean} value
     */
    set autoplay(value: boolean) {
        this._player.autoplay(value);
    }

    //---------------------------------------------------------------------------------------------
    // Player Controls
    //---------------------------------------------------------------------------------------------

    get muted(): boolean {
        return this._player.muted() ?? false;
    }

    set muted(value: boolean) {
        this._player.muted(value);
    }

    get volume(): number {
        return this._player.volume() ?? 0;
    }

    /**
     * @param {number} value volume between 0 and 100
     */
    set volume(value: number) {
        this._player.volume(value);
    }

    //---------------------------------------------------------------------------------------------
    // Transport Controls
    //---------------------------------------------------------------------------------------------

    load(): void {
        this._player.src({ src: this._track.src });
    }

    async play(): Promise<void> {
        try {
            await this._player.play();
        } catch (err) {
            if (
                isErrorLike(err) &&
                err.message.includes("didn't interact with the document first")
            ) {
                this.muted = true;
                return await this._player.play();
            }
            throw err;
        }
    }

    pause(): void {
        this._player.pause();
    }

    //---------------------------------------------------------------------------------------------
    // Position Tracking
    //---------------------------------------------------------------------------------------------

    _startPositionTracker(): void {
        if (this._positionTimer === undefined) {
            this._positionTimer = setInterval(() => {
                // Is the player playing?
                if (this._track.playing) {
                    // Dispatch timeupdate event
                    this.dispatchEvent(new Event(PlayerEvent.timeUpdate));
                }

                // Check for seek
                // - If the playback head jumps forwards/backwards by more than 1 second
                //   we'll fire a seeked event.
                const now = new Date().getTime();
                const position = this.currentTime;
                if (this._track.lastPositionCheck > 0) {
                    const movement =
                        Math.abs(position - this._track.lastPosition) * 1000;
                    const range = now - this._track.lastPositionCheck + 2000;
                    if (movement > range) {
                        this.dispatchEvent(new Event(PlayerEvent.seeked));
                    }
                }

                // Remember last position
                this._track.lastPositionCheck = now;
                this._track.lastPosition = position;
            }, 250);
        }
    }

    _stopPositionTracker(): void {
        if (this._positionTimer !== undefined) {
            clearInterval(this._positionTimer);
            this._positionTimer = undefined;
            this._track.lastPositionCheck = -1;
            this._track.lastPosition = -1;
        }
    }

    _applySkipTo(adjustPosition: boolean): void {
        if (this._track.skipTo && this._player) {
            const skipTo = this._track.skipTo;
            this._track.skipTo = undefined;

            // Seek to adjusted position
            const adjustment = adjustPosition
                ? (new Date().getTime() - skipTo.timeAdded) / 1000
                : 0;
            this.currentTime = skipTo.position + adjustment;
        }
    }

    //---------------------------------------------------------------------------------------------
    // Player Events
    //---------------------------------------------------------------------------------------------

    _onStateChangeEvent(event: any): void {
        // Dispatch state
        switch (event.type) {
            case PlayerEvent.playing:
                this._track.started = true;
                // Only fire play event when state first entered.
                // - We could be continuing after buffering
                if (!this._track.playing) {
                    this._startPositionTracker();
                    this._track.ended = false;
                    this._track.playing = true;
                    this._track.paused = false;
                }

                this._blockedState = BlockDetectionState.unblocked;
                // this._applySkipTo(true);
                break;
            case PlayerEvent.pause:
                this._track.ended = false;
                this._track.playing = false;
                this._track.paused = true;
                this._blockedState = BlockDetectionState.unblocked;
                // this._applySkipTo(false);
                break;
            case PlayerEvent.ended:
                this.load();
                this.play();
                this.pause();
                this._stopPositionTracker();
                this._track.ended = true;
                this._track.playing = false;
                this._track.paused = true;
                break;
            default:
                break;
        }
        if (event.type !== PlayerEvent.timeUpdate) {
            this.dispatchEvent(new Event(event.type));
        }
    }

    //---------------------------------------------------------------------------------------------
    // Video JS Specific APIs
    //---------------------------------------------------------------------------------------------

    height(value?: number | string): number | undefined {
        return this._player.height(value);
    }

    getChild(name: string): Component | undefined {
        return this._player.getChild(name);
    }

    children(): any[] {
        return this._player.children();
    }
}

function emptyTrackState(src: string): TrackState {
    return {
        started: false,
        ended: false,
        error: null,
        loaded: false,
        paused: true,
        playing: false,
        src: src,
        lastPosition: -1,
        lastPositionCheck: -1,
        skipTo: undefined,
        autoPause: false,
    };
}
