/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InkingCanvas } from "./InkingCanvas";
import { getPressureAdjustedSize, computeQuadBetweenTwoCircles, IPointerPoint,
    computeQuadBetweenTwoRectangles, IQuadPathItem } from "../core/Geometry";
import { DefaultPenBrush, IBrush } from "../core/Brush";
import { toCssColor } from "../core/Colors";

/**
 * Represents the base class from wet and dry canvases, implementing the common rendering logic.
 */
export abstract class DryWetCanvas extends InkingCanvas {
    private _innerLayer?: CanvasRenderingContext2D;
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

    private renderQuadPath(context: CanvasRenderingContext2D, path: IQuadPathItem[]) {
        const cssColor = this.getBrushCssColor();

        context.strokeStyle = cssColor;
        context.fillStyle = cssColor;

        context.beginPath();

        for (let item of path) {
            if (item.quad !== undefined) {
                this.renderQuad(context, item.quad);
            }

            if (this.brush.tip === "ellipse") {
                this.renderCircle(context, item.endPoint, item.tipSize);
            }
            else {
                this.renderRectangle(
                    context,
                    item.endPoint,
                    item.tipSize,
                    item.tipSize);
            }
        }

        context.fill();
        context.closePath();
    }

    /**
     * Defines the brush this canvas uses by default.
     * @returns The brush this canvas should use by default.
     */
    protected getDefaultBrush(): IBrush {
        return DefaultPenBrush;
    }

    /**
     * Converts the current brush's color to a CSS color.
     * @param color The color to convert.
     * @returns A CSS color. 
     */
    protected getBrushCssColor(): string {
        return toCssColor(this.brush.color, this.brush.type === "highlighter" ? 0.5 : 1);
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
     * Sets the appropriate blend mode on the specified ontext, according
     * to the current brush. In its base implementation, `setBlendMode` resets
     * both the opacity and composite operation to their defaults.
     * @param context 
     */
    protected adjustOpacity(context: CanvasRenderingContext2D) {
        context.globalAlpha = 1;
        context.canvas.style.opacity = "1";
    }

    /**
     * Implements the rendering logic for the current stroke.
     */
    protected internalRender() {
        if (!this.rendersProgressively()) {
            this.clear();
        }

        const path = this.computeQuadPath(this.brush.tipSize);

        this.adjustOpacity(this.context);

        this.renderQuadPath(this.context, path);

        if (this.brush.type === "laser") {
            const path = this.computeQuadPath(this.brush.tipSize / 3);

            if (!this._innerLayer) {
                this._innerLayer = this.addLayer();
            }    

            this.renderQuadPath(this._innerLayer, path);
        }
        else if (this._innerLayer) {
            this.removeLayer(this._innerLayer);

            this._innerLayer = undefined;
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

    protected internalCancelStroke() {
        // Nothing to do in base implementation
    }

    protected get points(): IPointerPoint[] {
        return this._points;
    }
}

/**
 * Represents a canvas suitable for "dry ink", i.e. the persistent drawing. DryCanvas renders
 * synchonously.
 */
export class DryCanvas extends DryWetCanvas {
    protected rendersAsynchronously(): boolean {
        return false;
    }

    /**
     * A "dry" canvas renders multiple strokes which might each have a different brush.
     * The underlying context's global alpha and composite operation must be set before
     * rendering each stroke.
     * @param context The context to set the blend mode on, given the current brus.
     */
    protected adjustOpacity(context: CanvasRenderingContext2D) {
        switch (this.brush.type) {
            case "laser":
                context.globalAlpha = InkingCanvas.laserShadowOpacity;
                break;
            case "highlighter":
            default:
                super.adjustOpacity(context);
                break;
        }
    }
}

/**
 * Represents a canvas suitable for "wet ink", i.e. an ongoing stroke.
 */
export class WetCanvas extends DryWetCanvas {
    protected getBrushCssColor(): string {
        // In a wet canvas, when using the highlighter, the brush color
        // used to draw the stroke is always opaque, and it's the canvas
        // itself that is semi-transparent.
        return toCssColor(this.brush.color);
    }

    /**
     * A "wet" canvas always renders a single stroke and is discarded when that stroke end.
     * It needs to be properly composited on whatever other DOM it is overlyed on, basically
     * the "dry" canvas. It is the HTML5 canvas that needs to be setup for the right blend
     * mode, by setting its opacity and mixBlendMode styles.
     * @param context The context to set the blend mode on, given the current brus.
     */
     protected adjustOpacity(context: CanvasRenderingContext2D) {
        switch (this.brush.type) {
            case "laser":
                context.canvas.style.opacity = InkingCanvas.laserShadowOpacity.toString();
                break;
            case "highlighter":
                context.canvas.style.opacity = InkingCanvas.highlighterOpacity.toString();
                break;
            default:
                super.adjustOpacity(context);
                break;
        }
    }
}