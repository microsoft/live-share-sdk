/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TWO_PI, IPointerPoint, IQuad, IPoint, viewportToScreen } from "../core/Geometry";
import { IStroke } from "../core/Stroke";
import { IBrush } from "../core/Brush";

/**
 * Defines the refernece point of a canvas. The reference point is the origin used for
 * panning and zooming operations.
 */
export type CanvasReferencePoint = "topLeft" | "center";

/**
 * Represents the base class for all canvases. InkingCanvas provides resizing, coordinate
 * tramnslation and base drawingprimitives.
 */
export abstract class InkingCanvas {
    /**
     * Configures the time it takes, in milliseconds, for an InkingCanvas to fade out.
     */
    public static fadeOutDuration = 300;

    /**
     * Configures the opacity of the laser stroke shadow.
     */
    public static laserShadowOpacity = 0.5;
    
    /**
     * Configures the opacity of highlighter strokes.
     */
    public static highlighterOpacity = 0.5;

    private _context: CanvasRenderingContext2D;
    private _additionalLayers: Set<CanvasRenderingContext2D> = new Set<CanvasRenderingContext2D>();
    private _strokeStarted: boolean = false;
    private _brush!: IBrush;
    private _offset: Readonly<IPoint> = { x: 0, y: 0 };
    private _scale: number = 1;
    private _clientWidth?: number;
    private _clientHeight?: number;
    private _renderTimeout?: number;

    private render() {
        if (this._parentElement) {
            this.internalRender();
        }
    }

    private scheduleRender() {
        if (this._renderTimeout) {
            window.cancelAnimationFrame(this._renderTimeout);
        }

        const doRender = () => {
            this.render();

            this._renderTimeout = undefined;
        }

        this._renderTimeout = window.requestAnimationFrame(doRender);
    }

    private getClientWidth(): number {
        if (!this._clientWidth) {
            this._clientWidth = this._parentElement ? this._parentElement.clientWidth : 100;
        }

        return this._clientWidth;
    }

    private getClientHeight(): number {
        if (!this._clientHeight) {
            this._clientHeight = this._parentElement ? this._parentElement.clientHeight : 100;
        }

        return this._clientHeight;
    }

    private createLayer(): CanvasRenderingContext2D {
        const canvas = document.createElement("canvas");
        canvas.style.position = "absolute";
        canvas.style.touchAction = "none";

        const default2DOptions: CanvasRenderingContext2DSettings = {
            alpha: true,
            desynchronized: false
        };
        
        const context: CanvasRenderingContext2D | null = canvas.getContext('2d', default2DOptions);

        if (context === null) {
            throw new Error('Could not get 2D context from canvas.');
        }

        return context;
    }

    private resizeLayer(context: CanvasRenderingContext2D, width: number, height: number) {
        context.canvas.style.width = `${width}px`;
        context.canvas.style.height = `${height}px`;
    
        context.canvas.width = width * window.devicePixelRatio;
        context.canvas.height = height * window.devicePixelRatio;

        context.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    private addLayerToDOM(context: CanvasRenderingContext2D) {
        if (this._parentElement) {
            this._parentElement.appendChild(context.canvas);

            this.resizeLayer(
                context,
                this.getClientWidth(),
                this.getClientHeight());
        }
    }

    private removeLayerFromDOM(context: CanvasRenderingContext2D) {
        if (this._parentElement) {
            this._parentElement.removeChild(context.canvas as HTMLElement);
        }
    }

    protected viewportToScreen(p: IPoint): IPointerPoint
    protected viewportToScreen(p: IPointerPoint): IPointerPoint {
        return {
            ...viewportToScreen(
                p,
                this.referencePoint === "center"
                    ? { x: this.getClientWidth() / 2, y: this.getClientHeight() / 2 }
                    : { x: 0, y: 0 },
                this.offset,
                this.scale
            ),
            pressure: p.pressure
        };
    }

    /**
     * Return the brush this canvas should use by default. Must be overridden
     * by descendant classes.
     */
    protected abstract getDefaultBrush(): IBrush;
    /**
     * Implements the rendering logic. Must be overridden by descendant classes.
     */
    protected abstract internalRender(): void;
    /**
     * Called when a new stroke is started.
     * @param p The point where the stroke starts.
     */
    protected abstract internalBeginStroke(p: IPointerPoint): void;
    /**
     * Called when a point should be added to the current stroke.
     * @param p The point to add to the current stroke.
     */
    protected abstract internalAddPoint(p: IPointerPoint): void;
    /**
     * Called when the current stroke ends.
     * @param p Optional. The point at which the stroke ends. If not provided,
     * the stroke ends at the last added point.
     */
    protected abstract internalEndStroke(p?: IPointerPoint): void;
    /**
     * Called when the current stroke is cancelled.
     */
    protected abstract internalCancelStroke(): void;

    /**
     * Determines if this canvas should render asynchronously. When rendering
     * asynchronously, render operations are scheduled on the next animation frame.
     * When rendering synchronously, render operations are executed right away.
     * @returns `true` if the canvas should render asynchronously, `false` otherwise.
     */
    protected rendersAsynchronously(): boolean {
        return true;
    }

    /**
     * Starts a new sub-path, at the specified coordinates.
     * @param context The target canvas context.
     * @param x The x coordinate, in pixels.
     * @param y The y coordinate, in pixels.
     */
    protected moveTo(context: CanvasRenderingContext2D,x: number, y: number) {
        const transformedPoint = this.viewportToScreen({ x, y });

        context.moveTo(transformedPoint.x, transformedPoint.y);
    }

    /**
     * Draws a line from the sub-path's last point to the specified point.
     * @param context The target canvas context.
     * @param x The x coordinate, in pixels.
     * @param y The y coordinate, in pixels.
     */
    protected lineTo(context: CanvasRenderingContext2D,x: number, y: number) {
        const transformedPoint = this.viewportToScreen({ x, y });

        context.lineTo(transformedPoint.x, transformedPoint.y);
    }

    /**
     * Renders a rectangle onto the canvas.
     * @param context The target canvas context.
     * @param center The center of the rectangle, in pixels.
     * @param halfWidth The half-width of the rectangle, in pixels.
     * @param halfHeight The half-height of the rectangle, in pixels.
     */
    protected renderRectangle(
        context: CanvasRenderingContext2D,
        center: IPoint,
        halfWidth: number,
        halfHeight: number): void {
        const left: number = center.x - halfWidth;
        const right: number = center.x + halfWidth;
        const top: number = center.y - halfHeight;
        const bottom: number = center.y + halfHeight;

        this.moveTo(context, left, top);
        this.lineTo(context, right, top);
        this.lineTo(context, right, bottom);
        this.lineTo(context, left, bottom);
        this.lineTo(context, left, top);
    }

    /**
     * Renders a "quad", i.e. a shape with four sides, onto the canvas.
     * @param context The target canvas context.
     * @param quad The quad to render.
     */
    protected renderQuad(context: CanvasRenderingContext2D, quad: IQuad): void {
        this.moveTo(context, quad.p1.x, quad.p1.y);
        this.lineTo(context, quad.p2.x, quad.p2.y);
        this.lineTo(context, quad.p3.x, quad.p3.y);
        this.lineTo(context, quad.p4.x, quad.p4.y);
        this.lineTo(context, quad.p1.x, quad.p1.y);
    }

    /**
     * Renders a circle onto the canvas.
     * @param context The target canvas context.
     * @param center The center of the circle, in pixels.
     * @param radius The radius of the circle, in pixels.
     */
    protected renderCircle(context: CanvasRenderingContext2D, center: IPoint, radius: number): void {
        const transformedCenter = this.viewportToScreen(center);

        context.arc(
            transformedCenter.x,
            transformedCenter.y,
            radius * this._scale,
            0,
            TWO_PI);
    }

    /**
     * Adds a new layer to the canvas.
     * @returns The new layer's context.
     */
    protected addLayer(): CanvasRenderingContext2D {
        const context = this.createLayer();

        this._additionalLayers.add(context);

        this.addLayerToDOM(context);

        return context;
    }

    /**
     * Removes a layer from the canvas.
     * @param context The layer to remove.
     */
    protected removeLayer(context: CanvasRenderingContext2D) {
        this.removeLayerFromDOM(context);

        this._additionalLayers.delete(context);
    }

    /**
     * Provides access to the underlying HTML5 canvas' CanvsRenderingContext2D
     */
    protected get context(): CanvasRenderingContext2D {
        return this._context;
    }

    /**
     * The canvas' reference point.
     */
    referencePoint: CanvasReferencePoint = "center";

     /**
     * Creates a new InkingCanvas instance, attached to the provided HTMLElement.
     * @param _parentElement The HTML element this canvas is attached to. InkingCanvas
     * dynamically creates an HTML5 Canvas element and adds it as a child to `parentElement`.
     */
    constructor(private _parentElement?: HTMLElement) {
        this._context = this.createLayer();

        this.addLayerToDOM(this._context);
    }

    /**
     * Fades the canvas out by decreasing its opacity, and eventually removes it
     * from the DOM.
     */
    fadeOut() {
        let opacity = 0.9;

        const doFadeOut = () => {
            if (opacity > 0) {
                this.canvas.style.opacity = opacity.toString();

                this._additionalLayers.forEach(
                    (context: CanvasRenderingContext2D) => {
                        context.canvas.style.opacity = opacity.toString();
                    }
                )

                window.setTimeout(doFadeOut, InkingCanvas.fadeOutDuration / 10);

                opacity -= 0.1;
            }
            else {
                this.removeFromDOM();
            }
        }

        window.setTimeout(doFadeOut, InkingCanvas.fadeOutDuration / 10);
    }

    /**
     * Removes the canvas from the DOM.
     */
    removeFromDOM() {
        this.removeLayerFromDOM(this.context);

        this._additionalLayers.forEach(
            (layer: CanvasRenderingContext2D) => {
                this.removeLayerFromDOM(layer);
            }
        )

        this._additionalLayers.clear();

        this._parentElement = undefined;
    }

    /**
     * Resizes this canvas.
     * @param width The new width of the canvas, in pixels.
     * @param height The new height of the canvas, in pixels.
     */
    resize(width: number, height: number) {
        this._clientWidth = undefined;
        this._clientHeight = undefined;

        this.resizeLayer(this.context, width, height);

        this._additionalLayers.forEach(
            (context: CanvasRenderingContext2D) => {
                this.resizeLayer(context, width, height);
            }
        );
    }

    /**
     * Clears the canvas.
     */
    clear() {
        const clearLayer = (context: CanvasRenderingContext2D) => {
            context.save();

            // Reset transform to identity to clear the whole canvas
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        
            context.restore();
        }

        clearLayer(this.context);

        this._additionalLayers.forEach(
            (context: CanvasRenderingContext2D) => {
                clearLayer(context);
            }
        )
    }

    /**
     * Begins a stroke in the canvas.
     * @param p The starting point of the stroke.
     */
    beginStroke(p: IPointerPoint) {
        this._strokeStarted = true;

        this.internalBeginStroke(p);

        if (this.rendersAsynchronously()) {
            this.scheduleRender();
        }
    }

    /**
     * Adds a points to the current stroke.
     * @param p The point to add to the current stroke.
     */
    addPoint(p: IPointerPoint) {
        if (!this._strokeStarted) {
            throw new Error("beginStroke must be called before addPoint.");
        }

        this.internalAddPoint(p);

        if (this.rendersAsynchronously()) {
            this.scheduleRender();
        }
    }

    /**
     * Ends the current stroke in the canvas.
     * @param p Optional. The end point of the stroke. If not specified,
     * the end point is the last one added.
     */
    endStroke(p?: IPointerPoint) {
        this.internalEndStroke(p);

        if (!this.rendersAsynchronously()) {
            this.render();
        }
        else {
            this.scheduleRender();
        }

        this._strokeStarted = false;
    }

    /**
     * Cancels the current stroke.
     */
    cancelStroke() {
        this.internalCancelStroke();

        this._strokeStarted = false;
    }

    /**
     * Renders the specified stroke onto the canvas.
     * @param stroke The stroke to render.
     */
    renderStroke(stroke: IStroke) {
        this.setBrush(stroke.brush);

        for (let i = 0; i < stroke.length; i++) {
            if (i === 0) {
                this.beginStroke(stroke.getPointAt(i));
            }
            else if (i === stroke.length - 1) {
                this.endStroke(stroke.getPointAt(i));
            }
            else {
                this.addPoint(stroke.getPointAt(i));
            }
        }
    }

    /**
     * Sets the current brush for the canvas.
     * @param value The brush.
     */
    setBrush(value: IBrush) {
        this._brush = value;
    }

    /**
     * Gets the underlying HTML5 Canvas element.
     */
    get canvas(): HTMLCanvasElement {
        return this._context.canvas;
    }

    /**
     * Gets the canvas' brush.
     */
    get brush(): IBrush {
        return this._brush ?? this.getDefaultBrush();
    }

    /**
     * Gets the offset from the canvas' reference point, in pixels.
     */
    get offset(): Readonly<IPoint> {
        return this._offset;
    }

    /**
     * Sets the offset from the canvas' reference point, in pixels.
     */
    set offset(value: IPoint) {
        this._offset = { ...value };
    }

    /**
     * Gets the canvas' scale. Defaults to 1.
     */
    get scale(): number {
        return this._scale;
    }

    /**
     * Sets the canvas' scale. Value must be greater than zero.
     */
    set scale(value: number) {
        if (value > 0) {
            this._scale = value;
        }
    }
}