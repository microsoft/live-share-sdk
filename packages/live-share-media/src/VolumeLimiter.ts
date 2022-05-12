/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

 import { TimeInterval } from '@microsoft/live-share';
 import { IMediaPlayer } from './IMediaPlayer';

export enum LevelType { fixed, percentage }

export class VolumeLimiter {
    private readonly _player: IMediaPlayer;

    // Settings
    private readonly _duration = new TimeInterval(2000);
    private readonly _rampDownDuration = new TimeInterval(500);
    private readonly _rampUpDuration = new TimeInterval(500);
    private _level: number = 0.1
    private _levelType: LevelType = LevelType.fixed;

    // Running state
    private _running = false;
    private _endTime = 0;
    private _startTime = 0;
    private _startVolume = 0;
    private _inRamp = false;

    constructor(player: IMediaPlayer) {
        this._player = player;
    }

    /**
     * Time, in seconds, that the volume should be lowered.
     * 
     * @remarks
     * Applications should periodically call `lowerVolume()` to keep teh volume lowered. 
     */
    public get duration(): number {
        return this._duration.seconds;
    }

    public set duration(value: number) {
        this._duration.seconds = Math.abs(value);
    }

    /**
     * Target level to lower volume to.
     * 
     * @remarks
     * Expressed as a value between 0.0 and 1.0. The value is applied based upon the configured
     * `levelType`. The default value is 0.2.
     * 
     * For a level type of `LevelType.fixed` the value is the exact level the volume will be 
     * lowered to. The default value of 0.2 would cause the volume to be lowered to 0.2.
     * 
     * For a level type of `LevelType.percentage` the value is the percentage by which the volume
     * level should be lowered to. The default value of 0.2 would cause the volume to be lowered
     * to 20% of its starting value.
     */
    public get level(): number {
        return this._level;
    }

    public set level(value: number) {
        if (value < 0 || value > 1.0) {
            throw new Error(`VolumeLimiter: cannot set level to ${value}. Level must be between 0.0 and 1.0.`);
        }

        this._level = value;
    }

    /**
     * The type of level represented by the `level` property.
     */
    public get levelType(): LevelType {
        return this._levelType;
    }

    public set levelType(value: LevelType) {
        this._levelType = value;
    }

    /**
     * Amount of time, in seconds, it should take to ramp the volume down to the desired level.
     */
    public get rampDownDuration(): number {
        return this._rampDownDuration.seconds;
    }

    public set rampDownDuration(value: number) {
        this._rampDownDuration.seconds = Math.abs(value);
    }

    /**
     * Amount of time, in seconds, it should take to ramp the volume back up to the original level.
     */
     public get rampUpDuration(): number {
        return this._rampUpDuration.seconds;
    }

    public set rampUpDuration(value: number) {
        this._rampUpDuration.seconds = Math.abs(value);
    }

    /**
     * Temporarily lowers an audio sources volume.
     */
    public lowerVolume(): void {
        this._endTime = new Date().getTime() + this._duration.milliseconds;
        if (!this._running) {
            this.startLimiter();
        }
    }

    private startLimiter(): void {
        const adjustVolume = () => {
            const now = new Date().getTime();
            if (now < this._endTime) {
                // Make no adjustment if muted
                if (!this._player.muted) {
                    // Compute adjusted volume level
                    let volume: number;
                    const targetVolume = this.computeTargetVolume();
                    const rampRange = this._startVolume - targetVolume;
                    const rampUpStart = this._endTime - this._rampUpDuration.milliseconds;
                    const rampDownEnd = this._startTime + this._rampDownDuration.milliseconds;
                    if (now > rampUpStart) {
                        // We're about to end so ramping up
                        const progress = (now - rampUpStart) / this._rampUpDuration.milliseconds;
                        volume = targetVolume + (rampRange * progress);
                        this._player.volume = volume;
                        this._inRamp = true;
                    } else if (now < rampDownEnd) {
                        // We just begun so ramping down
                        const remaining = (rampDownEnd - now) / this._rampUpDuration.milliseconds;
                        volume = targetVolume + (rampRange * remaining);
                        this._player.volume = volume;
                        this._inRamp = true;
                    } else if (this._inRamp) {
                        // We're at the end of a ramp
                        volume = targetVolume;
                        this._player.volume = volume;
                        this._inRamp = false;
                    }
                }

                // Schedule next animation frame
                this.scheduleAnimationFrame(adjustVolume);
            } else {
                // Reset volume to original level
                this._player.volume = this._startVolume;
                this._running = false;
                this._endTime = 0;
                this._startTime = 0;
                this._startVolume = 0;
            }
        };

        this._running = true;
        this._startTime = new Date().getTime();
        this._startVolume = this._player.volume;
        this.scheduleAnimationFrame(adjustVolume)
    }

    private scheduleAnimationFrame(callback: FrameRequestCallback): void {
        if (requestAnimationFrame) {
            requestAnimationFrame(callback);
        } else {
            setTimeout(callback, 20);
        }
    }

    private computeTargetVolume(): number {
        switch (this._levelType) {
            case LevelType.percentage:
                return this._startVolume * this._level;
            case LevelType.fixed:
            default:
                return this._level;
        }
    }
}