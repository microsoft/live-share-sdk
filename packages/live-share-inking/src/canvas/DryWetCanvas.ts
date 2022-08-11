/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InkingCanvas } from "./InkingCanvas";
import { getPressureAdjustedSize, computeQuadBetweenTwoCircles, IPointerPoint,
    computeQuadBetweenTwoRectangles, IQuadPathItem } from "../core/Geometry";
import { toCssColor, DefaultPenBrush, IBrush, IColor } from "./Brush";

/**
 * Represents the base class from wet and dry canvases, implementing the common rendering logic.
 */
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
                previousPointPressureAdjustedTip = getPressureAdjustedSize(tipHalfSize, previousPoint.pressure);
            }

            for (let i = this._pendingPointsStartIndex; i < this._points.length; i++) {
                const p = this._points[i];

                let pressureAdjustedTip = getPressureAdjustedSize(tipHalfSize, p.pressure);

                const pathItem: IQuadPathItem = {
                    endPoint: p,
                    tipSize: pressureAdjustedTip
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

    private renderQuadPath(path: IQuadPathItem[], color: IColor) {
        this.context.strokeStyle = toCssColor(color);
        this.context.fillStyle = toCssColor(color);

        this.beginPath();

        for (let item of path) {
            if (item.quad !== undefined) {
                this.renderQuad(item.quad);
            }

            if (this.brush.tip === "ellipse") {
                this.renderCircle(item.endPoint, item.tipSize);
            }
            else {
                this.renderRectangle(
                    item.endPoint,
                    item.tipSize,
                    item.tipSize);
            }
        }

        this.fill();
        this.closePath();
    }

    /**
     * Defines the brush this canvas uses by default.
     * @returns The brush this canvas should use by default.
     */
    protected getDefaultBrush(): IBrush {
        return DefaultPenBrush;
    }

    /**
     * Determines if this canvas renders strokes progressively. When rendering
     * progressively, the current stroke is rendered incrementally as new points
     * become available. When progressive rendering is disabled, the current
     * stroke is fully re-rendered every time.
     * @returns `true` if this canvas should render progressively, `false` otherwise.
     */
    protected rendersProgressively(): boolean {
        return true;
    }

    /**
     * Implements the rendering logic for the current stroke.
     */
    protected internalRender() {
        if (!this.rendersProgressively()) {
            this.clear();
        }

        const path = this.computeQuadPath(this.brush.tipSize);

        this.renderQuadPath(path, this.brush.color);

        if (this.brush.fillColor) {
            const reducedTipSize = this.brush.tipSize - this.brush.tipSize / 2;

            const path = this.computeQuadPath(reducedTipSize);

            this.renderQuadPath(path, this.brush.fillColor);
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

/**
 * Represents a canvas suitable for "dry ink", i.e. the persistent drawing. DryCanvas renders
 * synchonously and progressively.
 */
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

/**
 * Represents a canvas suitable for "wet ink", i.e. an ongoing stroke. WetCanvas renders
 * asynchonously. It renders progressively as long as its brush doesn't define a `fillColor`.
 */
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