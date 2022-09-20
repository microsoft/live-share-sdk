import { isInRange } from "@microsoft/live-share-canvas/bin/core/Internals";
import { MotionInputProvider, IVector } from "./MotionInputProvider";
import * as Utils from "./utils";

interface IOSDeviceOrientationEvent extends DeviceOrientationEvent {
    requestPermission?: () => Promise<string>;
}

class Range {
    private _min: number;
    private _max: number;

    constructor(public size: number, min: number = 0) {
        this._min = min;
        this._max = min + size;
    }

    slideToContain(value: number) {
        if (value < this.min) {
            this.min = value;
        }
        else if (value > this.max) {
            this.max = value;
        }
    }

    get min(): number {
        return this._min;
    }

    set min(value: number) {
        if (value !== this._min) {
            this._min = value;
            this._max = value + this.size;
        }
    }

    get max(): number {
        return this._max;
    }

    set max(value: number) {
        if (value !== this._max) {
            this._max = value;
            this._min = value - this.size;
        }
    }
}

export class OrientationBasedMotionInputProvider extends MotionInputProvider {
    private _alphaRange = new Range(45, -22.5);
    private _betaRange = new Range(45);

    protected start() {
        const deviceOrientationEvent = (DeviceOrientationEvent as any) as IOSDeviceOrientationEvent;

        if (deviceOrientationEvent.requestPermission) {
            deviceOrientationEvent.requestPermission().then((response: string) => {
                this.element.innerHTML = "";

                window.addEventListener(
                    "deviceorientation",
                    (e: DeviceOrientationEvent) => {
                        let alpha = Utils.valueOrDefault(e.alpha);

                        /**
                         * Initial alpha is always 0.
                         * Rotating left increases alpha.
                         * Rotating right decrases alpha from 360.
                         * We want to map that to a -180..179 range.
                         */
                        alpha = isInRange(alpha, 0, 180) ? -alpha : 360 - alpha;

                        // Slide the alpha range as necessary
                        this._alphaRange.slideToContain(alpha);

                        // beta is already in the -180...179 range
                        let beta = Utils.valueOrDefault(e.beta);

                        // Slide the alpha range as necessary
                        this._betaRange.slideToContain(beta);

                        alpha = alpha - this._alphaRange.min;
                        beta = beta - this._betaRange.min;

                        const clientWidth = this.bounds.right - this.bounds.left;
                        const clientHeight = this.bounds.bottom - this.bounds.top;

                        this._position = {
                            x: this.bounds.left + (clientWidth / this._alphaRange.size * alpha),
                            y: this.bounds.top + (clientHeight / this._betaRange.size * (this._betaRange.size - beta))
                        }

                        this.notifyPositionChanged();
                    });
            }).catch((err) => { this.displayData("Unable to request permission for device orientation."); });
        };
    }
}