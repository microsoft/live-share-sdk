/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { basicColors, IColor, InkingManager, IPoint, IPointerPoint } from "@microsoft/live-share-inking";

interface ITestInkingManager {
    pointerDown(p: IPointerPoint): void;
    pointerMove(p: IPointerPoint, isPointerDown: boolean): void;
    pointerUp(p: IPointerPoint): void;
    pointerLeave(p: IPointerPoint): void;
}

const strokeColors: IColor[] = [
    basicColors.black,
    basicColors.red,
    basicColors.green,
    basicColors.blue,
    basicColors.purple,
    basicColors.magenta,
    basicColors.violet,
    basicColors.gray
];

export class DrawingSimulation {
    private static pointsPerStroke = 100;
    private static processingDelay = 60;

    private _isStarted: boolean = false;
    private _points?: IPoint[];
    private _pointIndex = 0;

    private simulatePointerDown(p: IPointerPoint) {
        ((<unknown>this.inkingManager) as ITestInkingManager).pointerDown(p);
    }

    private simulatePointerMove(p: IPointerPoint, isPointerDown: boolean) {
        ((<unknown>this.inkingManager) as ITestInkingManager).pointerMove(p, isPointerDown);
    }

    private simulatePointerUp(p: IPointerPoint) {
        ((<unknown>this.inkingManager) as ITestInkingManager).pointerUp(p);
    }

    private computeSine(): IPoint[] {
        const sineWidth = this.inkingManager.clientWidth * 0.66; 
        const sineStep = sineWidth / DrawingSimulation.pointsPerStroke;
        const sineHeight = this.inkingManager.clientHeight * 0.05;

        let x = 0;

        const offset = {
            x: (this.inkingManager.clientWidth - sineWidth) * Math.random(),
            y: (this.inkingManager.clientHeight - sineHeight) * Math.random()
        }

        const result: IPoint[] = [];

        for (let i = 0; i < DrawingSimulation.pointsPerStroke; i++) {
            result.push(
                {
                    x: x + offset.x,
                    y: Math.sin(x) * sineHeight * Math.random() * 1.5 + offset.y
                }
            );
            
            x += sineStep;
        }

        return result;
    }

    private getRandomColor(): IColor {
        return strokeColors[Math.floor(Math.random() * (strokeColors.length - 1))];
    }

    private draw = () => {
        if (!this._points) {
            this._points = this.computeSine();
            this._pointIndex = 0;

            this.inkingManager.penBrush.color = this.getRandomColor();

            this.simulatePointerDown({ ...this._points[this._pointIndex++], pressure: 0.5});
        }
        else {
            if (this._pointIndex < this._points.length - 1) {
                this.simulatePointerMove(
                    { ...this._points[this._pointIndex++], pressure: 0.5},
                    true
                );
            }
            else {
                this.simulatePointerUp({ ...this._points[this._pointIndex], pressure: 0.5});

                this._points = undefined;
            }
        }

        if (this._isStarted) {
            this.scheduleDraw();
        }
    }

    private scheduleDraw() {
        if (this._isStarted) {
            window.setTimeout(this.draw, DrawingSimulation.processingDelay);
            // window.requestAnimationFrame(this.draw);
        }
    }

    constructor(private inkingManager: InkingManager) { }

    start() {
        if (!this._isStarted) {
            this.inkingManager.deactivate();

            this._isStarted = true;

            this.scheduleDraw();
        }
    }

    stop() {
        this._isStarted = false;

        if (this._points) {
            this.simulatePointerUp({ ...this._points[this._pointIndex], pressure: 0.5});

            this._points = undefined;
        }
    }

    get isStarted(): boolean {
        return this._isStarted;
    }
}