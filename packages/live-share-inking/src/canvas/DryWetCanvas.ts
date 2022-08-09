/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

 import { InkingCanvas } from "./InkingCanvas";
import { getPressureAdjustedTipSize, computeQuadBetweenTwoCircles, IQuad, IPointerPoint, computeQuadBetweenTwoRectangles, IPoint } from "../core/Geometry";
import { DefaultPenBrush, IBrush, IColor } from "./Brush";
import { colorToCssColor } from "../core/Utils";

interface IQuadPathItem {
    quad?: IQuad,
    endPoint: IPointerPoint
}

export abstract class DryWetCanvas extends InkingCanvas {
    private _pendingPointsStartIndex = 0;
    private _points: IPointerPoint[] = [];

    private computeQuadPath(tipSize: number): IQuadPathItem[] {
        const result: IQuadPathItem[] = [];
        const tipHalfSize = tipSize / 2;

        if (this._pendingPointsStartIndex < this._points.length) {
            let previousPoint: IPointerPoint | undefined = undefined;
            let previousPointPressureAdjustedTip = 0;
            
            if (this._pendingPointsStartIndex > 0) {
                previousPoint = this._points[this._pendingPointsStartIndex - 1];
                previousPointPressureAdjustedTip = getPressureAdjustedTipSize(tipHalfSize, previousPoint.pressure);
            }

            const quad: IQuad = {
                p1: { x: 0, y: 0 },
                p2: { x: 0, y: 0 },
                p3: { x: 0, y: 0 },
                p4: { x: 0, y: 0 }
            };

            for (let i = this._pendingPointsStartIndex; i < this._points.length; i++) {
                const p = this._points[i];

                let pressureAdjustedTip = getPressureAdjustedTipSize(tipHalfSize, p.pressure);

                const pathItem: IQuadPathItem = {
                    endPoint: p
                };

                if (previousPoint !== undefined) {
                    pathItem.quad = this.brush.tip === "ellipse"
                        ? computeQuadBetweenTwoCircles(
                            p,
                            pressureAdjustedTip,
                            previousPoint,
                            previousPointPressureAdjustedTip)
                        : computeQuadBetweenTwoRectangles(
                            p,
                            pressureAdjustedTip,
                            pressureAdjustedTip,
                            previousPoint,
                            previousPointPressureAdjustedTip,
                            previousPointPressureAdjustedTip);
                }

                result.push(pathItem);

                previousPoint = p;
                previousPointPressureAdjustedTip = pressureAdjustedTip;
            }
        }

        return result;
    }

    private renderQuadPath(path: IQuadPathItem[], tipSize: number, color: IColor) {
        this.context.strokeStyle = colorToCssColor(color);
        this.context.fillStyle = colorToCssColor(color);

        const tipHalfSize = tipSize / 2;

        this.beginPath();

        for (let item of path) {
            const pressureAdjustedTip = getPressureAdjustedTipSize(tipHalfSize, item.endPoint.pressure);

            if (item.quad !== undefined) {
                this.renderQuad(item.quad);
            }

            if (this.brush.tip === "ellipse") {
                this.renderCircle(item.endPoint, pressureAdjustedTip);
            }
            else {
                this.renderRectangle(
                    item.endPoint,
                    pressureAdjustedTip,
                    pressureAdjustedTip);
            }
        }

        this.fill();
        this.closePath();
    }

    protected getDefaultBrush(): IBrush {
        return DefaultPenBrush;
    }

    protected rendersProgressively(): boolean {
        return true;
    }

    protected internalRender() {
        if (!this.rendersProgressively()) {
            this.clear();
        }

        const path = this.computeQuadPath(this.brush.tipSize);

        this.renderQuadPath(path, this.brush.tipSize, this.brush.color);

        if (this.brush.fillColor) {
            const reducedTipSize = this.brush.tipSize - this.brush.tipSize / 2;

            const path = this.computeQuadPath(reducedTipSize);
            this.renderQuadPath(path, reducedTipSize , this.brush.fillColor);
        }

        if (this.rendersProgressively()) {
            this._pendingPointsStartIndex = this._points.length;
        }
    }

    protected internalBeginStroke(p: IPointerPoint) {
        this._points = [p];
        this._pendingPointsStartIndex = 0;
    }

    protected internalAddPoint(p: IPointerPoint) {
        this._points.push(p);
    }

    protected internalEndStroke(p?: IPointerPoint) {
        if (p) {
            this._points.push(p);
        }
    }
}

export class DryCanvas extends DryWetCanvas {
    protected rendersAsynchronously(): boolean {
        // The dry canvas renders synchronously to favor speed
        return false;
    }

    setBrush(value: IBrush) {
        super.setBrush(value);

        // On a dry canvas, blendMode is applied on the context so whatever is drawn combines with what's already drawn
        this.context.globalCompositeOperation = this.brush.blendMode === "normal" ? "source-over" : "darken";
    } 
}

export class WetCanvas extends DryWetCanvas {
    protected rendersProgressively(): boolean {
        return this.brush.fillColor === undefined;
    }

    setBrush(value: IBrush) {
        super.setBrush(value);

        // On a wet canvas, blendMode is applied on the <canvas> element so it is blended with whatever DOM element is
        // under it. The caveat is that mix-blend-mode and globalCompositeOperation do not darken the exact same way.
        // The end result is that when a stroke is "dried", i.e. moved from the wet canvas to the dry canvas, darkened
        // portions will look darker than when being drawn on the wet canvas.
        this.canvas.style.mixBlendMode = this.brush.blendMode === "normal" ? "normal" : "darken";
    } 
}