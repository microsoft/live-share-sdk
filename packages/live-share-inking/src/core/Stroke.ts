/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

 import { IBrush, DefaultPenBrush } from "../canvas/Brush";
import { doRectanglesOverlap, getDistanceBetweenPoints, getSegmentIntersectionsWithRectangle, getSegmentsIntersection,
    IPoint, IPointerPoint, IRect, ISegment, isPointInsideRectangle, isRectangleInsideRectangle,
    segmentMayIntersectWithRectangle, unionRect } from "./Geometry";
import { generateUniqueId } from "./Utils";

interface IStrokeData {
    id: string;
    clientId?: string;
    brush: IBrush;
    points: IPointerPoint[];
}

export enum StrokeType {
    LaserPointer,
    Ephemeral,
    Persistent
}

export interface IStroke {
    addPoints(...points: IPointerPoint[]): boolean;
    intersectsWithRectangle(rectangle: IRect): boolean;
    getIntersectionPoints(segment: ISegment): IPoint[];
    getPointAt(index: number): IPointerPoint;
    getBoundingRect(): IRect;
    pointErase(eraserRect: IRect): IStroke[] | undefined;
    serialize(): string;
    deserialize(serializedStroke: string): void;
    readonly id: string;
    readonly clientId?: string;
    readonly brush: IBrush;
    readonly length: number;
}

export interface IStrokeCreationOptions {
    id?: string;
    clientId?: string;
    brush?: IBrush;
    points?: IPointerPoint[];
}

export class Stroke implements IStroke, Iterable<IPointerPoint> {
    private _brush: IBrush = {...DefaultPenBrush};
    private _points: IPointerPoint[];
    private _iteratorCounter = 0;
    private _id: string;
    private _clientId?: string;
    private _boundingRect?: IRect;

    private addPoint(p: IPointerPoint): boolean {
        let lastPoint: IPointerPoint | undefined = undefined;

        if (this._points.length !== 0) {
            lastPoint = this._points[this._points.length - 1];
        }

        if (lastPoint === undefined || lastPoint.x !== p.x || lastPoint.y !== p.y) {
            this._points.push(p);

            return true;
        }

        if (this._boundingRect && !isPointInsideRectangle(p, this._boundingRect)) {
            this._boundingRect = undefined;
        }

        return false;
    }

    constructor(options?: IStrokeCreationOptions) {
        const effectiveOptions: IStrokeCreationOptions = {
            id: options ? options.id : undefined,
            clientId: options ? options.clientId : undefined,
            brush: options ? options.brush : undefined,
            points: options ? options.points : undefined
        }

        this._id = effectiveOptions.id ?? generateUniqueId();
        this._clientId = effectiveOptions.clientId;
        this._points = effectiveOptions.points ?? [];

        this.brush = {...(effectiveOptions.brush ?? DefaultPenBrush)};
    }

    addPoints(...points: IPointerPoint[]): boolean {
        let pointsAdded = false;

        for (let point of points) {
            if (this.addPoint(point)) {
                pointsAdded = true;
            }
        }

        return pointsAdded;
    }

    intersectsWithRectangle(rectangle: IRect): boolean {
        let previousPoint: IPointerPoint | undefined = undefined;

        for (const p of this) {
            if (previousPoint) {
                const intersections = getSegmentIntersectionsWithRectangle({ from: previousPoint, to: p }, rectangle);

                if (intersections.length > 0) {
                    return true;
                }
            }

            previousPoint = p;
        }

        return false;
    }

    getIntersectionPoints(segment: ISegment): IPoint[] {
        const result: IPoint[] = [];
        let previousPoint: IPointerPoint | undefined = undefined;

        for (const p of this) {
            if (previousPoint) {
                const intersection = getSegmentsIntersection(segment, { from: previousPoint, to: p });

                if (intersection) {
                    result.push(intersection);
                }
            }

            previousPoint = p;
        }

        return result;
    }

    getBoundingRect(): IRect {
        if (this._boundingRect === undefined) {
            const result = {
                left: Number.MAX_VALUE,
                top: Number.MAX_VALUE,
                right: -Number.MAX_VALUE,
                bottom: -Number.MAX_VALUE
            };

            for (const p of this) {
                unionRect(result, p);
            }

            this._boundingRect = result;
        }

        return this._boundingRect;
    }

    getPointAt(index: number): IPointerPoint {
        return this._points[index];
    }

    pointErase(eraserRect: IRect): IStroke[] | undefined {
        const boundingRect = this.getBoundingRect();

        if (isRectangleInsideRectangle(boundingRect, eraserRect)) {
            // The whole stroke is inside the eraser, so it needs to be fully deleted
            return [];
        }

        if (!doRectanglesOverlap(eraserRect, boundingRect)) {
            // The eraser is outside the bounding box of the stroke and therefore
            // there is nothing to erase
            return undefined;
        }

        let previousPoint: IPointerPoint | undefined = undefined;

        const generatedStrokes: IStroke[] = [];
        let currentStroke = new Stroke({ brush: this.brush });

        for (const p of this) {
            if (previousPoint) {
                const segment: ISegment = { from: previousPoint, to: p };
                
                if (segmentMayIntersectWithRectangle(segment, eraserRect)) {
                    const intersections = getSegmentIntersectionsWithRectangle(segment, eraserRect);

                    if (intersections.length === 1) {
                        // One intersection, we need to cut that segment into two
                        if (isPointInsideRectangle(previousPoint, eraserRect)) {
                            currentStroke = new Stroke({ brush: this.brush });

                            currentStroke.addPoint({ ...intersections[0], pressure: previousPoint.pressure });
                            currentStroke.addPoint(p);
                        }
                        else {
                            currentStroke.addPoint({ ...intersections[0], pressure: p.pressure });

                            generatedStrokes.push(currentStroke);

                            currentStroke = new Stroke({ brush: this.brush });
                        }
                    }
                    else if (intersections.length === 2) {
                        // Two intersections, we need to cut the part that's inside the eraser rectangle
                        const d1 = getDistanceBetweenPoints(previousPoint, intersections[0]);
                        const d2 = getDistanceBetweenPoints(previousPoint, intersections[1]);

                        let [firstIndex, secondIndex] = d1 < d2 ? [0, 1] : [1, 0];

                        currentStroke.addPoint({ ...intersections[firstIndex], pressure: previousPoint.pressure });

                        generatedStrokes.push(currentStroke);

                        currentStroke = new Stroke({ brush: this.brush });
                        currentStroke.addPoint({ ...intersections[secondIndex], pressure: previousPoint.pressure });
                        currentStroke.addPoint(p);
                    }
                    else if (!isPointInsideRectangle(previousPoint, eraserRect) && !isPointInsideRectangle(p, eraserRect)) {
                        // The segment is fully outside the eraser rectangle, we keep it and add it to the current stroke
                        if (currentStroke.length === 0) {
                            currentStroke.addPoint(previousPoint);
                        }

                        currentStroke.addPoint(p);
                    }
                }
                else {
                    currentStroke.addPoint(p);
                }
            }
            else {
                currentStroke.addPoint(p);
            }

            previousPoint = p;
        }

        if (currentStroke.length > 1) {
            generatedStrokes.push(currentStroke);
        }

        return generatedStrokes;
    }

    serialize(): string {
        const data: IStrokeData = {
            id: this.id,
            clientId: this.clientId,
            brush: this.brush,
            points: this._points
        };

        return JSON.stringify(data);
    }

    deserialize(serializedStroke: string) {
        const data: IStrokeData = JSON.parse(serializedStroke) as IStrokeData;

        this._id = data.id;
        this._clientId = data.clientId;
        this._brush = data.brush;
        this._points = data.points;
    }

    [Symbol.iterator]() {
        this._iteratorCounter = 0;

        return {
            next: () => {
                return {
                    done: this._iteratorCounter === this._points.length,
                    value: this._points[this._iteratorCounter++]
                }
            }
        }
    }

    get id(): string {
        return this._id;
    }

    get clientId(): string | undefined {
        return this._clientId;
    }

    get length(): number {
        return this._points.length;
    }

    get brush(): IBrush {
        return this._brush;
    }

    set brush(value: IBrush) {
        this._brush = { ...value };
    }
}