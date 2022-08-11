/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InkingCanvas } from "./InkingCanvas";
import { getPressureAdjustedSize, computeQuadBetweenTwoCircles, IPointerPoint, IQuad, IQuadPathItem } from "../core/Geometry";
import { toCssColor, DefaultLaserPointerBrush, IBrush, IColor } from "./Brush";

/**
 * Represents a canvas that implements the laser pointer behavior.
 */
 export class LaserPointerCanvas extends InkingCanvas {
    private static readonly TrailingPointsRemovalInterval = 20;

    private _points: IPointerPoint[] = [];
    private _trailingPointsRemovalInterval?: number;

    private scheduleTrailingPointsRemoval() {
        if (this._trailingPointsRemovalInterval === undefined) {
            this._trailingPointsRemovalInterval = window.setInterval(
                () => {
                    if (this._points.length > 1) {
                        const pointsToRemove = Math.max((this._points.length - 1) / 5, 1);

                        this._points.splice(0, pointsToRemove);
                    }
                    else {
                        window.clearInterval(this._trailingPointsRemovalInterval);

                        this._trailingPointsRemovalInterval = undefined;
                    }
                },
                LaserPointerCanvas.TrailingPointsRemovalInterval);
        }
    }

    private computeQuadPath(tipSize: number): IQuadPathItem[] {
        const result: IQuadPathItem[] = [];

        let previousPoint: IPointerPoint | undefined = undefined;
        let radius = tipSize / 2;

        const radiusStep = (radius - (radius / 3)) / this._points.length;

        for (let i = this._points.length - 1; i >= 0; i--) {
            const p = this._points[i];

            const pathItem: IQuadPathItem = {
                endPoint: p,
                tipSize: radius
            };

            if (previousPoint !== undefined) {
                pathItem.quad = computeQuadBetweenTwoCircles(
                    p,
                    getPressureAdjustedSize(radius, p.pressure),
                    previousPoint,
                    getPressureAdjustedSize(radius - radiusStep, previousPoint.pressure));
            }

            result.push(pathItem);

            radius -= radiusStep;

            previousPoint = p;
        }

        return result;
    }

    private renderQuadPath(path: IQuadPathItem[], color: IColor) {
        this.context.fillStyle = toCssColor(color);

        let previousPoint: IPointerPoint | undefined = undefined;

        this.beginPath();

        for (let item of path) {
            if (item.quad !== undefined) {
                this.renderQuad(item.quad);
            }

            this.renderCircle(item.endPoint, item.tipSize);
        }

        this.closePath();
        this.fill();
    }

    protected getDefaultBrush(): IBrush {
        return DefaultLaserPointerBrush;
    }

    protected internalRender() {
        this.clear();

        const path = this.computeQuadPath(this.brush.tipSize);

        this.renderQuadPath(path, this.brush.color);

        if (this.brush.fillColor) {
            const reducedTipSize = this.brush.tipSize - this.brush.tipSize / 2;

            const path = this.computeQuadPath(reducedTipSize);

            this.renderQuadPath(path, this.brush.fillColor);
        }
    }

    protected internalBeginStroke(p: IPointerPoint) {
        this._points = [p];
    }

    protected internalAddPoint(p: IPointerPoint) {
        this._points.push(p);

        this.scheduleTrailingPointsRemoval();
    }

    protected internalEndStroke(p?: IPointerPoint) {
        if (this._trailingPointsRemovalInterval !== undefined) {
            window.clearInterval(this._trailingPointsRemovalInterval);

            this._trailingPointsRemovalInterval = undefined;
        }

        if (p) {
            this.internalAddPoint(p);
        }
    }
}