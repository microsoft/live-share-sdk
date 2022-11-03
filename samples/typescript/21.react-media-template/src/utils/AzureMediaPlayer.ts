/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

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
 * Class for AzureMediaPlayer HTML shiv for compatibility with `MediaSynchronizer`.
 * If your media player's interface doesn't follow the HTML interface, this example
 * will help show how to create a thin wrapper around your player to make it function
 * exactly like an HTML5 media element so the `MediaSynchronizer` can properly wire
 * up `LiveMediaSession` action handlers.
 *
 * @remarks
 *
 * @param {string} videoElementId element ID for HTML <video> element.
 * @param {[{src: string}]} src array of media tracks (e.g., [{src: "YOUR_VIDEO_LINK"}]).
 * @param {any} options Optional. AMP player options.
 */
export class AzureMediaPlayer extends EventTarget {
    _videoElementId: string;
    _player: any;
    _options;

    // Position tracking
    _positionTimer: NodeJS.Timeout | undefined;

    // Track state
    _track = emptyTrackState("");
    _blockedState = BlockDetectionState.unknown;

    // If browser blocks initial play event due to autoplay policy
    // we mute and try again
    _autoplayPolicyChecked = false;

    constructor(videoElementId: string, src: string, options = {}) {
        super();
        this._videoElementId = videoElementId;
        const defaultOptions = {
            controls: false,
            fluid: true,
            logo: { enabled: false },
        };
        this._options = Object.assign({}, defaultOptions, options);
        this._track.src = src;

        this._setupPlayer();
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
        return this._player.currentTime();
    }

    /**
     * @param {number} value timestamp in seconds
     */
    set currentTime(value: number) {
        this._player.currentTime(value);
    }

    get duration(): number {
        return this._player.duration();
    }

    get paused(): boolean {
        return this._player.paused();
    }

    get playbackQuality(): string {
        return this._player.playbackQuality();
    }

    /**
     * @param {string} value playback quality (e.g., 'default')
     */
    set playbackQuality(value: string) {
        this._player.playbackQuality(value);
    }

    get playbackRate(): number {
        return this._player.playbackRate();
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
        return this._player.autoplay();
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
        return this._player.muted();
    }

    set muted(value: boolean) {
        this._player.muted(value);
    }

    get volume(): number {
        return this._player.volume();
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
        this._player.src(this._track.src);
    }

    async play(): Promise<void> {
        this._player.play();
        if (!this._autoplayPolicyChecked) {
            this._autoplayPolicyChecked = true;
            if (this.paused) {
                this.muted = true;
                this.play();
            }
        }
        // HTMLMediaPlayer spec is Promise<void> but AMP does not adhere to this spec for play, so we simply
        // resolve the promise.
        return Promise.resolve();
    }

    pause(): void {
        this._player.pause();
    }

    //---------------------------------------------------------------------------------------------
    // AMP Variables
    //---------------------------------------------------------------------------------------------

    get currentPlaybackBitrate(): number {
        return this._player.currentPlaybackBitrate();
    }

    get currentDownloadBitrate(): number {
        return this._player.currentDownloadBitrate();
    }

    get currentHeuristicProfile(): string {
        return this._player.currentHeuristicProfile();
    }

    get resolution(): string {
        return `${this._player.videoWidth()}x${this._player.videoHeight()}`;
    }

    //---------------------------------------------------------------------------------------------
    // Player Setup
    //---------------------------------------------------------------------------------------------

    async _setupPlayer(): Promise<void> {
        await loadAzureMediaPlayerScript();
        const videoElement = document.getElementById(this._videoElementId);
        function onReady(this: AzureMediaPlayer) {
            this._player.disablePictureInPicture = true;
            this._player.src({ src: this._track.src });
            this.dispatchEvent(new Event(PlayerEvent.ready));
            this._startPositionTracker();
            Object.entries(PlayerEvent).forEach(([_, value]) => {
                this._player.addEventListener(
                    value,
                    this._onStateChangeEvent.bind(this)
                );
            });
        }
        this._player = window.amp(
            videoElement,
            this._options,
            onReady.bind(this)
        );
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

//---------------------------------------------------------------------------------------------
// Azure Media Player Loader
//---------------------------------------------------------------------------------------------
let loaded: Promise<void> | undefined = undefined;

export function loadAzureMediaPlayerScript(): Promise<void> {
    if (!loaded && !window.amp) {
        loaded = new Promise<void>((resolve, reject) => {
            const scriptTag = document.createElement("script");
            const linkTag = document.createElement("link");
            linkTag.rel = "stylesheet";
            scriptTag.id = "amp-azure";
            scriptTag.src =
                "//amp.azure.net/libs/amp/latest/azuremediaplayer.min.js";
            linkTag.href = `//amp.azure.net/libs/amp/latest/skins/amp-default/azuremediaplayer.min.css`;
            document.body.appendChild(scriptTag);
            document.head.insertBefore(linkTag, document.head.firstChild);
            scriptTag.onload = () => resolve();
        });
    }
    return loaded || Promise.resolve();
}
