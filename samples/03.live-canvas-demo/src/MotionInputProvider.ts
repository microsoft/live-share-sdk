/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { getDistanceBetweenPoints, InputProvider, IPoint, IPointerEvent, IPointerPoint } from "@microsoft/live-share-canvas";

interface IOSDeviceMotionEvent extends DeviceMotionEvent {
    requestPermission?: () => Promise<string>;
}

type IVector = IPoint;

interface ITimedVector extends IVector {
    time: number;
}

function forceIntoRange(n: number, min: number, max: number): { result: number, wasForced: boolean } {
    if (n < min) {
        return { result: min, wasForced: true };
    }

    if (n > max) {
        return { result: max, wasForced: true };
    }

    return { result: n, wasForced: false };
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

function valueOrDefault(n: number | undefined | null, defaultValue: number = 0): number {
    return typeof n === "number" ? n : defaultValue;
}

export class MotionInputProvider extends InputProvider {
    public static MaxAccelerationSamples = 6;
    public static Threshold = 0.1;

    private _activePointerId?: number;
    private _accelerationSamples: ITimedVector[] = [];
    private _velocity: IVector = { x: 0, y: 0 };
    private _position: IVector = { x: 0, y: 0 };

    private capturePointer(pointerId: number) {
        try {
            this.element.setPointerCapture(pointerId);

            this._activePointerId = pointerId;
        }
        catch (e) {
            console.error(`Could not capture pointer with id ${pointerId}: ${e}`);
        }
    }

    private releaseActivePointer() {
        if (this._activePointerId !== undefined) {
            try {
                this.element.releasePointerCapture(this._activePointerId);
            }
            catch (e) {
                console.error(`Could not release pointer with id ${this._activePointerId}: ${e}`);
            }

            this._activePointerId = undefined;
        }
    }

    private vectorToPointerEvent(v: IVector): IPointerEvent {
        return {
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            ...v,
            pressure: 0.5
        };
    }

    private onPointerDown = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === undefined) {
                this.capturePointer(e.pointerId);

                this.pointerDownEvent.emit(this.vectorToPointerEvent(this._position));
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    private onPointerUp = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === e.pointerId) {
                this.releaseActivePointer();

                this.pointerUpEvent.emit(this.vectorToPointerEvent(this._position));
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    private displayData(data: any) {
        this.element.innerText = JSON.stringify(
            data,
            (key: string, value: any) => {
                if (typeof value === "number") {
                    let sign = value >= 0 ? "+" : "-";

                    let n = Math.abs(value).toFixed(2);

                    return sign + n;
                }
                else {
                    return value;
                }
            },
            4);
    }

    activate() {
        super.activate();

        this.element.addEventListener('pointerdown', this.onPointerDown);
        this.element.addEventListener('pointerup', this.onPointerUp);
    }

    deactivate() {
        super.deactivate();

        this.element.removeEventListener('pointerdown', this.onPointerDown);
        this.element.removeEventListener('pointerup', this.onPointerUp);
    }

    private notifyPositionChanged() {
        this.pointerMoveEvent.emit(
            {
                ...this.vectorToPointerEvent(this._position),
                isPointerDown: this._activePointerId !== undefined
            });
    }

    private computeNewPosition() {
        let effectiveAcceleration: IVector = averageOfVectors(this._accelerationSamples);

        if (getDistanceBetweenPoints({ x: 0, y: 0 }, effectiveAcceleration) < MotionInputProvider.Threshold) {
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

        const newX = forceIntoRange(newPosition.x, 0, this.element.clientWidth);
        const newY = forceIntoRange(newPosition.y, 0, this.element.clientHeight);

        this._position = {
            x: newX.result,
            y: newY.result
        }

        velocity.x = effectiveAcceleration.x === 0 ? 0 : (newX.wasForced ? 0 : velocity.x);
        velocity.y = effectiveAcceleration.y === 0 ? 0 : (newY.wasForced ? 0 : velocity.y);

        this._velocity = velocity;
        
        // this.displayData(effectiveAcceleration);
    }

    constructor(readonly element: HTMLElement) {
        super();

        this._position = {
            x: element.clientWidth / 2,
            y: element.clientHeight / 2
        };

        const button = document.createElement("button");
        button.innerText = "Allow access to device motion";
        button.style.fontSize = "30px";
        button.onclick = () => {
            const deviceMotionEvent = (DeviceMotionEvent as any) as IOSDeviceMotionEvent;

            if (deviceMotionEvent.requestPermission) {
                deviceMotionEvent.requestPermission().then((response: string) => {
                    if (response === "granted") {
                        element.removeChild(button);
                        
                        window.addEventListener(
                            "devicemotion",
                            (e: DeviceMotionEvent) => {
                                if (e.acceleration) {
                                    const effectiveAcceleration: ITimedVector = {
                                        x: valueOrDefault(e.acceleration.x),
                                        y: valueOrDefault(e.acceleration.z),
                                        time: Date.now()
                                    }

                                    this._accelerationSamples.push(effectiveAcceleration);

                                    if (this._accelerationSamples.length >= MotionInputProvider.MaxAccelerationSamples) {
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

        element.appendChild(button);
    }
}
