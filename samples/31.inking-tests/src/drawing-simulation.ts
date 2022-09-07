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
    private static strokeCount = 20;

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

    public draw() {
        for (let i = 0; i < DrawingSimulation.strokeCount; i++) {
            const points = this.computeSine();

            this.inkingManager.penBrush.color = this.getRandomColor();

            for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
                const p: IPointerPoint = {
                    ...points[pointIndex],
                    pressure: 0.5
                }

                if (pointIndex === 0) {
                    this.simulatePointerDown(p);
                }
                else if (pointIndex === points.length - 1) {
                    this.simulatePointerUp(p);
                }
                else {
                    this.simulatePointerMove(p, true);
                }
            }
        }
    }

    constructor(private inkingManager: InkingManager) { }
}