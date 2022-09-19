/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InputProvider, IPointerEvent, IPointerPoint } from "@microsoft/live-share-canvas";

interface DeviceMotionEventIOS extends DeviceMotionEvent {
    requestPermission?: () => Promise<string>;
}

export function forceIntoRange(n: number, min: number, max: number): number {
    if (n < min) {
        return min;
    }

    if (n > max) {
        return max;
    }

    return n;
}

interface IVector {
    x: number;
    y: number;
}

interface ITimedVector extends IVector {
    time: number;
}

export class MotionInputProvider extends InputProvider {
    private _currentPosition: IPointerPoint;
    private _activePointerId?: number;
    private _velocity: IVector = { x: 0, y: 0 };

    private valueOrDefault(n: number | undefined | null, defaultValue: number = 0): number {
        return typeof n === "number" ? n : defaultValue;
    }

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

    private pointerPointToPointerEvent(p: IPointerPoint): IPointerEvent {
        return {
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            ...p
        };
    }

    private onPointerDown = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === undefined) {
                this.capturePointer(e.pointerId);

                this.pointerDownEvent.emit(this.pointerPointToPointerEvent(this._currentPosition));
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    private onPointerUp = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === e.pointerId) {
                this.releaseActivePointer();

                this.pointerUpEvent.emit(this.pointerPointToPointerEvent(this._currentPosition));
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

    constructor(readonly element: HTMLElement) {
        super();

        this._currentPosition = {
            x: element.clientWidth / 2,
            y: element.clientHeight / 2,
            pressure: 0.5
        };

        const button = document.createElement("button");
        button.innerText = "Get permission";
        button.onclick = () => {
            const deviceMotionEvent = DeviceMotionEvent as unknown as DeviceMotionEventIOS;

            if (deviceMotionEvent.requestPermission) {
                deviceMotionEvent.requestPermission().then((response: string) => {
                    if (response === "granted") {
                        window.addEventListener(
                            "devicemotion",
                            (e: DeviceMotionEvent) => {
                                if (e.acceleration) {
                                    const effectiveAcceleration: IVector = {
                                        x: this.valueOrDefault(e.acceleration.x),
                                        y: this.valueOrDefault(e.acceleration.z)
                                    }

                                    const timeDelta = e.interval * 100;

                                    this._velocity = {
                                        x: this._velocity.x - effectiveAcceleration.x * timeDelta,
                                        y: this._velocity.y - effectiveAcceleration.y * timeDelta,
                                    }

                                    this._currentPosition = {
                                        x: forceIntoRange(this._currentPosition.x + this._velocity.x * timeDelta, 0, element.clientWidth),
                                        y: forceIntoRange(this._currentPosition.y + this._velocity.y * timeDelta, 0, element.clientWidth),
                                        pressure: 0.5
                                    }

                                    this.pointerMoveEvent.emit(
                                        {
                                            ...this.pointerPointToPointerEvent(this._currentPosition),
                                            isPointerDown: this._activePointerId !== undefined
                                        });
                                    
                                    this.displayData(this._velocity);
                                }

                                e.preventDefault();
                                e.stopPropagation();
                            });
                    }
                }).catch((err) => { element.innerText = "Error: " + err; });
            }
        }

        element.appendChild(button);
    }
}
