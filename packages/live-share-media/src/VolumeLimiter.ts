import { TimeInterval } from '@microsoft/live-share';
 import { IMediaPlayer } from './IMediaPlayer';

export enum LevelType { fixed, percentage }
export class VolumeLimiter {
    private readonly _player: IMediaPlayer;
    private readonly _rampDuration = new TimeInterval(500);
    private _level = 0.1
    private _levelType: LevelType = LevelType.fixed;

    private _selectedVolume = 1.0;
    private _limited = false;
    private _startTime = 0;
    private _startVolume = 0;

    constructor(player: IMediaPlayer) {
        this._player = player;
        this._player.volume = this._selectedVolume;
    }

    /**
     * The selected volume.
     *
     * @remarks
     * Expressed as a value between 0.0 and 1.0. The default value is 1.0.
     * Can be used for things like volume sliders.
     */
    public get selectedVolume(): number {
        return this._selectedVolume;
    }

    public set selectedVolume(value: number) {
        if (value < 0 || value > 1.0) {
            throw new Error(`VolumeLimiter: cannot set selectedVolume to ${value}. Level must be between 0.0 and 1.0.`);
        }

        this._selectedVolume = value;
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
    public get rampDuration(): number {
        return this._rampDuration.seconds;
    }

    public set rampDuration(value: number) {
        this._rampDuration.seconds = Math.abs(value);
    }

    /**
     * Limits volume based on `level` and `levelType` properties.
     */
    public enableLimit(): void {
        this._limited = true
        this.startAdjusting();
    }

    /**
     * disables volume limit.
     */
    public disableLimit(): void {
        this._limited = false
        this.startAdjusting();
    }

    private startAdjusting() {
        this._startTime = new Date().getTime();
        this._startVolume = this._player.volume;

        const adjustVolume = () => {
            if (this.milliIntoRamp() <= this._rampDuration.milliseconds) {
                const newVolume = this.computeRampVolume();
                console.log("adjusting", newVolume);
                this._player.volume = newVolume;
                this.scheduleAnimationFrame(adjustVolume);
            } else {
                const newVolume = this.computeTargetVolume();
                console.log("adjusting", newVolume);
                this._player.volume = newVolume;
            }
        }
        this.scheduleAnimationFrame(adjustVolume);
    }

    private scheduleAnimationFrame(callback: FrameRequestCallback): void {
        if (requestAnimationFrame) {
            requestAnimationFrame(callback);
        } else {
            setTimeout(callback, 20);
        }
    }

    private computeRampVolume(): number {
        const volumeDifference = this.computeTargetVolume() - this._startVolume
        const adjustmentFromStart = volumeDifference / this._rampDuration.milliseconds * this.milliIntoRamp()
        return this._startVolume + adjustmentFromStart;
    }

    private computeTargetVolume(): number {
        if (this._levelType == LevelType.percentage) {
            if (this._limited) {
                return this._selectedVolume * this._level;
            } else {
                return this._selectedVolume
            }
        } else {
            if (this._limited && this._selectedVolume > this._level) {
                return this._level
            } else {
                return this._selectedVolume
            }
        }
    }

    private milliIntoRamp(): number {
        const now = new Date().getTime()
        return now - this._startTime;
    }
}