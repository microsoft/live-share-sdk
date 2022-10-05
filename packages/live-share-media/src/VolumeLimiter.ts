import { TimeInterval } from '@microsoft/live-share';
 import { IMediaPlayer } from './IMediaPlayer';

export class VolumeLimiter {
    private readonly _player: IMediaPlayer;
    private readonly _rampDuration = new TimeInterval(4500);

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
        console.log("limiting volume")
        this._limited = true
        this._startTime = new Date().getTime();
        this._startVolume = this._player.volume
    }

    public noLimit(): void {
        console.log("removing volume limit");
        this._limited = false
        this._startTime = new Date().getTime();
        this._startVolume = this._player.volume
    }

    private startAdjusting() {
        const adjustVolume = () => {
            const newVolume = this.computeVolume()
            console.log("adjusting volume", newVolume)
            this._player.volume = newVolume;
            this.scheduleAnimationFrame(adjustVolume);
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
    private computeVolume(): number {
        const now = new Date().getTime()
        const timeIntoRamp = now - this._startTime;

        if (timeIntoRamp > this._rampDuration.milliseconds) {
            return this.computeTargetVolume();
        }

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
}