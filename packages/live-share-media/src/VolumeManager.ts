/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TimeInterval } from "@microsoft/live-share";
import { IMediaPlayer } from "./IMediaPlayer";

export enum LimitLevelType {
    fixed,
    percentage,
}

/**
 * Smooth audio level changes when volume is modified, or if volume limiting has started/ended.
 */
export class VolumeManager {
    private readonly _player: IMediaPlayer;
    private readonly _volumeChangeDuration = new TimeInterval(500);

    // defaults to player volume
    private _volume = 0.0;
    private _isLimiting = false;
    private _limitLevel = 0.1;
    private _limitLevelType: LimitLevelType = LimitLevelType.fixed;
    private _startTime = 0;
    private _startVolume = 0;
    private _running = false;

    constructor(player: IMediaPlayer) {
        this._player = player;
        this._volume = this._player.volume;
    }

    /**
     * The selected volume.
     *
     * @remarks
     * Expressed as a value between 0.0 and 1.0. The default value is 1.0.
     * Can be used for things like volume sliders.
     *
     * Does not return the current volume if limiting is enabled, but the desired volume.
     */
    public get volume(): number {
        return this._volume;
    }

    public set volume(value: number) {
        if (value < 0 || value > 1.0) {
            throw new Error(
                `VolumeManager: cannot set volume to ${value}. Level must be between 0.0 and 1.0.`
            );
        }

        this._volume = value;
        this.startAdjusting();
    }

    /**
     * Target level to lower volume to.
     *
     * @remarks
     * Expressed as a value between 0.0 and 1.0. The value is applied based upon the configured
     * `levelType`. The default value is 0.1.
     *
     * For a level type of `LevelType.fixed` the value is the exact level the volume will be
     * lowered to. The default value of 0.1 would cause the volume to be lowered to 0.1.
     *
     * For a level type of `LevelType.percentage` the value is the percentage by which the volume
     * level should be lowered to. The default value of 0.1 would cause the volume to be lowered
     * to 10% of its starting value.
     */
    public get limitLevel(): number {
        return this._limitLevel;
    }

    public set limitLevel(value: number) {
        if (value < 0 || value > 1.0) {
            throw new Error(
                `VolumeManager: cannot set level to ${value}. Level must be between 0.0 and 1.0.`
            );
        }

        this._limitLevel = value;
    }

    /**
     * The type of level represented by the `limitLevel` property.
     */
    public get limitLevelType(): LimitLevelType {
        return this._limitLevelType;
    }

    public set limitLevelType(value: LimitLevelType) {
        this._limitLevelType = value;
    }

    /**
     * Amount of time, in seconds, it should take to change the volume up or down to the desired level.
     *
     * @remarks
     * Default `volumeChangeDuration` is 0.5 seconds.
     */
    public get volumeChangeDuration(): number {
        return this._volumeChangeDuration.seconds;
    }

    public set volumeChangeDuration(value: number) {
        this._volumeChangeDuration.seconds = Math.abs(value);
    }

    /**
     * Whether or not volume limiting is currently enabled.
     */
    public get isLimiting(): boolean {
        return this._isLimiting;
    }

    /**
     * Limits volume based on `limitLevel` and `limitLevelType` properties.
     * @see `limitLevel`
     * @see `limitLevelType`
     */
    public startLimiting(): void {
        this._isLimiting = true;
        this.startAdjusting();
    }

    /**
     * Disables volume limit.
     */
    public stopLimiting(): void {
        this._isLimiting = false;
        this.startAdjusting();
    }

    private startAdjusting() {
        const adjustVolume = () => {
            // Schedule next animation frame if volume change not finished
            if (
                this.millisSinceVolumeChangeStart() <=
                this._volumeChangeDuration.milliseconds
            ) {
                this._player.volume = this.computeInterpolatedVolume();
                this.scheduleAnimationFrame(adjustVolume);
            } else {
                this._player.volume = this.computeTargetVolume();
                this._running = false;
            }
        };

        this._startTime = new Date().getTime();
        this._startVolume = this._player.volume;
        if (!this._running) {
            this._running = true;
            this.scheduleAnimationFrame(adjustVolume);
        }
    }

    private scheduleAnimationFrame(callback: FrameRequestCallback): void {
        if (typeof requestAnimationFrame == "function") {
            requestAnimationFrame(callback);
        } else {
            setTimeout(
                callback,
                Math.min(this._volumeChangeDuration.milliseconds / 25, 20)
            );
        }
    }

    private computeInterpolatedVolume(): number {
        const volumeChangeMillis = this._volumeChangeDuration.milliseconds;
        const volumeDifference = this.computeTargetVolume() - this._startVolume;
        const adjustmentFromStart =
            (volumeDifference / volumeChangeMillis) *
            this.millisSinceVolumeChangeStart();
        return this._startVolume + adjustmentFromStart;
    }

    private computeTargetVolume(): number {
        if (this._limitLevelType == LimitLevelType.percentage) {
            if (this._isLimiting) {
                return this._volume * this._limitLevel;
            } else {
                return this._volume;
            }
        } else {
            if (this._isLimiting && this._volume > this._limitLevel) {
                return this._limitLevel;
            } else {
                return this._volume;
            }
        }
    }

    private millisSinceVolumeChangeStart(): number {
        const now = new Date().getTime();
        return now - this._startTime;
    }
}
