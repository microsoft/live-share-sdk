import { TimeInterval } from '@microsoft/live-share';
 import { IMediaPlayer } from './IMediaPlayer';

export class VolumeLimiter {
    private readonly _player: IMediaPlayer;
    private readonly _rampDuration = new TimeInterval(500);

    private _selectedVolume = 1.0;
    private _limitVolume = 0.1;
    private _limited = false;
    private _startTime = 0;
    private _startVolume = 0;

    constructor(player: IMediaPlayer) {
        this._player = player;
        this.startAdjusting();
    }

    public limit(): void {
        this._limited = true
        this._startTime = new Date().getTime();
        this._startVolume = this._player.volume
        this.startAdjusting()
    }

    public noLimit(): void {
        this._limited = false
        this._startTime = new Date().getTime();
        this._startVolume = this._player.volume
        this.startAdjusting()
    }

    private startAdjusting() {
        const adjustVolume = () => {
            if (this.milliIntoRamp() <= this._rampDuration.milliseconds) {
                const newVolume = this.computeRampVolume()
                this._player.volume = newVolume;
                this.scheduleAnimationFrame(adjustVolume);
            } else {
                this._player.volume = this.computeTargetVolume();
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

    // returns the volume it should be, adjusted for how long its been ramping
    private computeRampVolume(): number {
        const timeIntoRamp = this.milliIntoRamp();
        const targetVolume = this.computeTargetVolume()
        const adjustmentFromStart = (targetVolume - this._startVolume) / this._rampDuration.milliseconds * timeIntoRamp
        return this._startVolume + adjustmentFromStart;
    }

    private computeTargetVolume(): number {
        if (this._limited && this._selectedVolume > this._limitVolume) {
            return this._limitVolume
        } else {
            return this._selectedVolume
        }
    }

    private milliIntoRamp(): number {
        const now = new Date().getTime()
        return now - this._startTime;
    }
}