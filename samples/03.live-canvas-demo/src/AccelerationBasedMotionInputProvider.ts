import { getDistanceBetweenPoints } from "@microsoft/live-share-canvas";
import { MotionInputProvider, IVector, ITimedVector } from "./MotionInputProvider";
import * as Utils from "./utils";

interface IOSDeviceMotionEvent extends DeviceMotionEvent {
    requestPermission?: () => Promise<string>;
}

function averageOfVectors(vectors: IVector[]): IVector {
    let sumX = 0;
    let sumY = 0;

    for (let i in vectors) {
        sumX += vectors[i].x;
        sumY += vectors[i].y;
    }

    return {
        x: sumX / vectors.length,
        y: sumY / vectors.length
    }
}

export class AccelerationBasedMotionInputProvider extends MotionInputProvider {
    public static MaxAccelerationSamples = 6;
    public static Threshold = 0.1;

    private _accelerationSamples: ITimedVector[] = [];
    private _velocity: IVector = { x: 0, y: 0 };

    private computeNewPosition() {
        let effectiveAcceleration: IVector = averageOfVectors(this._accelerationSamples);

        if (getDistanceBetweenPoints({ x: 0, y: 0 }, effectiveAcceleration) < AccelerationBasedMotionInputProvider.Threshold) {
            effectiveAcceleration = { x: 0, y: 0 };
        }

        const timeInterval = (this._accelerationSamples[this._accelerationSamples.length - 1].time - this._accelerationSamples[0].time) / this._accelerationSamples.length / 5;

        const velocity: IVector = {
            x: this._velocity.x - effectiveAcceleration.x * timeInterval,
            y: this._velocity.y + effectiveAcceleration.y * timeInterval
        }

        const newPosition = {
            x: this._position.x + velocity.x * timeInterval,
            y: this._position.y + velocity.y * timeInterval
        }

        const newX = Utils.forceIntoRange(newPosition.x, 0, this.element.clientWidth);
        const newY = Utils.forceIntoRange(newPosition.y, 0, this.element.clientHeight);

        this._position = {
            x: newX.result,
            y: newY.result
        }

        velocity.x = effectiveAcceleration.x === 0 ? 0 : (newX.wasForced ? 0 : velocity.x);
        velocity.y = effectiveAcceleration.y === 0 ? 0 : (newY.wasForced ? 0 : velocity.y);

        this._velocity = velocity;

        // this.displayData(effectiveAcceleration);
    }

    protected start() {
        const deviceMotionEvent = (DeviceMotionEvent as any) as IOSDeviceMotionEvent;

        if (deviceMotionEvent.requestPermission) {
            deviceMotionEvent.requestPermission().then((response: string) => {
                if (response === "granted") {
                    this.element.innerHTML = "";
                    
                    window.addEventListener(
                        "devicemotion",
                        (e: DeviceMotionEvent) => {
                            if (e.acceleration) {
                                const effectiveAcceleration: ITimedVector = {
                                    x: Utils.valueOrDefault(e.acceleration.x),
                                    y: Utils.valueOrDefault(e.acceleration.z),
                                    time: Date.now()
                                }

                                this._accelerationSamples.push(effectiveAcceleration);

                                if (this._accelerationSamples.length >= AccelerationBasedMotionInputProvider.MaxAccelerationSamples) {
                                    this.computeNewPosition();

                                    this._accelerationSamples = [];
                                }

                                this.notifyPositionChanged();
                            }

                            e.preventDefault();
                            e.stopPropagation();
                        });
                }
                else {
                    this.displayData("Access to device motion was denied.");
                }
            }).catch((err) => { this.displayData("Unable to request permission for device motion."); });
        }
    }
}