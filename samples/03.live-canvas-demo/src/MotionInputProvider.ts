/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InputProvider, IPoint, IPointerEvent, IRect } from "@microsoft/live-share-canvas";

export type IVector = IPoint;

export interface ITimedVector extends IVector {
    time: number;
}

export abstract class MotionInputProvider extends InputProvider {
    private _activePointerId?: number;
    private _bounds: IRect;

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

    protected vectorToPointerEvent(v: IVector): IPointerEvent {
        return {
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            ...v,
            pressure: 0.5
        };
    }

    protected displayData(data: any) {
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

    protected notifyPositionChanged() {
        this.pointerMoveEvent.emit(
            {
                ...this.vectorToPointerEvent(this._position),
                isPointerDown: this._activePointerId !== undefined
            });
    }

    protected abstract start(): void;

    protected _position: IVector = { x: 0, y: 0 };

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

    constructor(readonly element: HTMLElement, bounds?: IRect) {
        super();

        this._bounds = bounds ?? {
            top: 0,
            left: 0,
            right: element.clientWidth,
            bottom: element.clientHeight };

        const button = document.createElement("button");
        button.innerText = "Allow access to device motion";
        button.style.fontSize = "30px";
        button.onclick = () => {
            this.start();
        }

        element.appendChild(button);
    }

    get bounds(): IRect {
        return this._bounds;
    }

    set bounds(value: IRect) {
        this._bounds = { ...value };
    }
}
