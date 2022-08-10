/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TWO_PI, IPointerPoint, IQuad, IPoint, viewportToScreen } from "../core/Geometry";
import { IStroke } from "../core/Stroke";
import { IBrush } from "./Brush";

export type CanvasReferencePoint = "topLeft" | "center";

export abstract class InkingCanvas {
    public static fadeOutLength = 300;

    private _context: CanvasRenderingContext2D;
    private _strokeStarted: boolean = false;
    private _brush!: IBrush;
    private _offset: Readonly<IPoint> = { x: 0, y: 0 };
    private _scale: number = 1;
    private _clientWidth?: number;
    private _clientHeight?: number;

    private _internalRenderCallback = () => {
        this.internalRender();

        if (this._strokeStarted) {
            window.requestAnimationFrame(this._internalRenderCallback);
        }
    }

    private getClientWidth(): number {
        if (!this._clientWidth) {
            this._clientWidth = this.canvas.clientWidth;
        }

        return this._clientWidth;
    }

    private getClientHeight(): number {
        if (!this._clientHeight) {
            this._clientHeight = this.canvas.clientHeight;
        }

        return this._clientHeight;
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

    protected abstract getDefaultBrush(): IBrush;
    protected abstract internalRender(): void;
    protected abstract internalBeginStroke(p: IPointerPoint): void;
    protected abstract internalAddPoint(p: IPointerPoint): void;
    protected abstract internalEndStroke(p?: IPointerPoint): void;

    protected rendersAsynchronously(): boolean {
        return true;
    }

    protected get context(): CanvasRenderingContext2D {
        return this._context;
    }

    referencePoint: CanvasReferencePoint = "center";

    constructor(parentElement?: HTMLElement) {
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
    
        this._context = context;

        if (parentElement) {
            parentElement.appendChild(canvas);

            this.resize(parentElement.clientWidth, parentElement.clientHeight);
        }
    }

    fadeOut() {
        let opacity = 0.9;

        const doFadeOut = () => {
            if (opacity > 0) {
                this.canvas.style.opacity = opacity.toString();

                window.setTimeout(doFadeOut, InkingCanvas.fadeOutLength / 10);

                opacity -= 0.1;
            }
            else {
                this.removeFromDOM();
            }
        }

        window.setTimeout(doFadeOut, InkingCanvas.fadeOutLength / 10);
    }

    removeFromDOM() {
        const parentElement = this.canvas.parentElement;

        if (parentElement) {
            parentElement.removeChild(this.canvas as HTMLElement);
        }
    }

    resize(width: number, height: number) {
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    
        this.canvas.width = width * window.devicePixelRatio;
        this.canvas.height = height * window.devicePixelRatio;

        this._context.scale(window.devicePixelRatio, window.devicePixelRatio);

        this._clientWidth = undefined;
        this._clientHeight = undefined;
    }

    clear() {
        this._context.save();

        // Reset transform to identity to clear the whole canvas
        this._context.setTransform(1, 0, 0, 1, 0, 0);
        this._context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
        this._context.restore();
    }

    copy(source: InkingCanvas) {
        this._context.drawImage(source.canvas, 0, 0);
    }

    beginStroke(p: IPointerPoint) {
        this._strokeStarted = true;

        this.internalBeginStroke(p);

        if (this.rendersAsynchronously()) {
            window.requestAnimationFrame(this._internalRenderCallback);
        }
        else {
            this.internalRender();
        }
    }

    addPoint(p: IPointerPoint) {
        this.internalAddPoint(p);
    }

    endStroke(p?: IPointerPoint) {
        this._strokeStarted = false;

        this.internalEndStroke(p);

        this.internalRender();
    }

    cancelStroke() {
        this._strokeStarted = false;
    }

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

    renderCircle(center: IPoint, radius: number): void {
        const transformedCenter = this.viewportToScreen(center);

        this._context.arc(
            transformedCenter.x,
            transformedCenter.y,
            radius * this._scale,
            0,
            TWO_PI);
    }

    beginPath() {
        this._context.beginPath();
    }

    closePath() {
        this._context.closePath();
    }

    fill() {
        this._context.fill();
    }

    moveTo(x: number, y: number) {
        const transformedPoint = this.viewportToScreen({ x, y });

        this._context.moveTo(transformedPoint.x, transformedPoint.y);
    }

    lineTo(x: number, y: number) {
        const transformedPoint = this.viewportToScreen({ x, y });

        this._context.lineTo(transformedPoint.x, transformedPoint.y);
    }

    renderRectangle(center: IPoint, halfWidth: number, halfHeight: number): void {
        const left: number = center.x - halfWidth;
        const right: number = center.x + halfWidth;
        const top: number = center.y - halfHeight;
        const bottom: number = center.y + halfHeight;

        this.moveTo(left, top);
        this.lineTo(right, top);
        this.lineTo(right, bottom);
        this.lineTo(left, bottom);
        this.lineTo(left, top);
    }

    renderQuad(quad: IQuad): void {
        this.moveTo(quad.p1.x, quad.p1.y);
        this.lineTo(quad.p2.x, quad.p2.y);
        this.lineTo(quad.p3.x, quad.p3.y);
        this.lineTo(quad.p4.x, quad.p4.y);
        this.lineTo(quad.p1.x, quad.p1.y);
    }

    enablePointerEvents(): void {
        this._context.canvas.style.pointerEvents = 'auto';
    }

    disablePointerEvents(): void {
        this._context.canvas.style.pointerEvents = 'none';
    }

    setBrush(value: IBrush) {
        this._brush = value;
    }

    get canvas(): HTMLCanvasElement {
        return this._context.canvas;
    }

    get hasStrokeEnded(): boolean {
        return !this._strokeStarted;
    }

    get brush(): IBrush {
        return this._brush ?? this.getDefaultBrush();
    }

    get offset(): Readonly<IPoint> {
        return this._offset;
    }

    set offset(value: IPoint) {
        this._offset = { ...value };
    }

    get scale(): number {
        return this._scale;
    }

    set scale(value: number) {
        if (value > 0) {
            this._scale = value;
        }
    }
}