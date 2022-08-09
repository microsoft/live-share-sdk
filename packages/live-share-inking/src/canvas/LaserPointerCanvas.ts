/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InkingCanvas } from "./InkingCanvas";
import { getPressureAdjustedTipSize, computeQuadBetweenTwoCircles, IPointerPoint, IQuad } from "../core/Geometry";
import { DefaultLaserPointerBrush, IBrush } from "./Brush";
import { brightenColor, colorToCssColor } from "../core/Utils";

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

    private internalRenderWithBrush(brush: IBrush) {
        this.context.fillStyle = colorToCssColor(brush.color);

        let previousPoint: IPointerPoint | undefined = undefined;
        let radius = brush.tipSize / 2;

        const radiusStep = (radius - (radius / 3)) / this._points.length;

        for (let i = this._points.length - 1; i >= 0; i--) {
            const p = this._points[i];

            if (i === this._points.length - 1) {
                this.context.beginPath();
            }

            if (previousPoint !== undefined) {
                const quad = computeQuadBetweenTwoCircles(
                    p,
                    getPressureAdjustedTipSize(radius, p.pressure),
                    previousPoint,
                    getPressureAdjustedTipSize(radius - radiusStep, previousPoint.pressure));

                if (quad) {
                    this.renderQuad(quad);
                }
            }

            this.renderCircle(p, getPressureAdjustedTipSize(radius, p.pressure));

            radius -= radiusStep;

            previousPoint = p;
        }

        this.context.closePath();
        this.context.fill();
    }

    protected getDefaultBrush(): IBrush {
        return DefaultLaserPointerBrush;
    }

    protected internalRender() {
        this.clear();

        this.internalRenderWithBrush(this.brush);

        const innerBrush: IBrush = {
            ...this.brush,
            color: brightenColor(this.brush.color, 50),
            tipSize: this.brush.tipSize - this.brush.tipSize / 2
        };

        this.internalRenderWithBrush(innerBrush);
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