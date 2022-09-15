/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { BasicColors, IColor, InkingManager, InputProvider, IPoint, IPointerEvent, IPointerMoveEvent } from "@microsoft/live-share-canvas";

const strokeColors: IColor[] = [
    BasicColors.black,
    BasicColors.red,
    BasicColors.green,
    BasicColors.blue,
    BasicColors.purple,
    BasicColors.magenta,
    BasicColors.violet,
    BasicColors.gray
];

class DummyInputProvider extends InputProvider {
    emitPointerDownEvent(e: IPointerEvent) {
        this.pointerDownEvent.emit(e);
    }

    emitPointerMoveEvent(e: IPointerMoveEvent) {
        this.pointerMoveEvent.emit(e);
    }

    emitPointerUpEvent(e: IPointerEvent) {
        this.pointerUpEvent.emit(e);
    }
}

export class DrawingSimulation {
    private static pointsPerStroke = 100;
    private static strokeCount = 20;

    private _dummyInputProvider = new DummyInputProvider();

    private computeSine(): IPoint[] {
        const sineWidth = this.inkingManager.clientWidth * 0.66;
        const sineStep = sineWidth / DrawingSimulation.pointsPerStroke;
        const sineHeight = this.inkingManager.clientHeight * 0.05;

        let x = 0;

        const offset = {
            x: (this.inkingManager.clientWidth - sineWidth) * Math.random(),
            y: this.inkingManager.clientHeight * Math.random()
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

    public async draw(midDrawCallback: () => Promise<void>) {
        for (let i = 0; i < DrawingSimulation.strokeCount; i++) {
            const points = this.computeSine();
            const halfWayIndex = Math.floor(points.length / 2);

            this.inkingManager.penBrush.color = this.getRandomColor();

            for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
                const p: IPointerEvent = {
                    altKey: false,
                    ctrlKey: false,
                    shiftKey: false,
                    ...points[pointIndex],
                    pressure: 0.5
                };

                if (pointIndex === 0) {
                    this._dummyInputProvider.emitPointerDownEvent(p);
                }
                else if (pointIndex === points.length - 1) {
                    this._dummyInputProvider.emitPointerUpEvent(p);
                }
                else {
                    this._dummyInputProvider.emitPointerMoveEvent( { ...p, isPointerDown: true });
                }

                if (pointIndex === halfWayIndex) {
                    await midDrawCallback();
                }
            }
        }
    }

    constructor(private inkingManager: InkingManager) {
        inkingManager.inputProvider = this._dummyInputProvider;
    }
}