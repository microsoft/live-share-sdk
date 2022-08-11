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
    timeStamp: number;
    brush: IBrush;
    points: IPointerPoint[];
}

/**
 * Stroke types.
 */
export enum StrokeType {
    /**
     * Laser pointer stroke, with a vanishing tail.
     */
    LaserPointer,
    /**
     * Ephemeral stroke, which vanishes all at once after
     * a set amount of time.
     */
    Ephemeral,
    /**
     * Persistent stroke, that remains on the canvas until
     * erased.
     */
    Persistent
}

/**
 * Defines a stroke, i.e. a collection of points that can
 * be rendered on a canvas.
 */
export interface IStroke {
    /**
     * Adds points to the stroke.
     * @param points The points to add.
     */
    addPoints(...points: IPointerPoint[]): boolean;
    /**
     * Determines if the stroke intersects with the specified
     * rectangle.
     * @param rectangle The rectangle to test against.
     */
    intersectsWithRectangle(rectangle: IRect): boolean;
    /**
     * Computes the intersection points between the stroke
     * and the specified segment.
     * @param segment The segment to test against.
     */
    getIntersectionPoints(segment: ISegment): IPoint[];
    /**
     * Gets the point at the given index.
     * @param index The point index.
     */
    getPointAt(index: number): IPointerPoint;
    /**
     * Computes the stroke's bounding rectangle.
     */
    getBoundingRect(): IRect;
    /**
     * Splits this stroke into several other ones by "erasing"
     * the portions that are within the eraser rectangle.
     * @param eraserRect The eraser rectangle.
     */
    pointErase(eraserRect: IRect): IStroke[] | undefined;
    /**
     * Serializes the stroke to a string.
     */
    serialize(): string;
    /**
     * Deserializes the specified stroke string and sets this
     * stroke's brush, points and other proprties accordingly.
     * @param serializedStroke The serialized stroke.
     */
    deserialize(serializedStroke: string): void;
    /**
     * The id of the stroke.
     */
    readonly id: string;
    /**
     * Optional. The id of the client the stroke was created on.
     */
    readonly clientId?: string;
    /**
     * The timestamp when the stroke was created.
     */
    readonly timeStamp: number;
    /**
     * The brush used to draw the stroke.
     */
    readonly brush: IBrush;
    /**
     * The number of points in the stroke.
     */
    readonly length: number;
}

/**
 * Defines a set of options when creating new strokes.
 */
export interface IStrokeCreationOptions {
    id?: string;
    clientId?: string;
    timeStamp?: number;
    brush?: IBrush;
    points?: IPointerPoint[];
}

/**
 * Represents a concrete stroke object.
 */
export class Stroke implements IStroke, Iterable<IPointerPoint> {
    private _brush: IBrush = {...DefaultPenBrush};
    private _points: IPointerPoint[];
    private _iteratorCounter = 0;
    private _id: string;
    private _clientId?: string;
    private _timeStamp: number;
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

    /**
     * Creates a new Stroke instance.
     * @param options Optional creation options such as id, points, etc.
     */
    constructor(options?: IStrokeCreationOptions) {
        const effectiveOptions: IStrokeCreationOptions = {
            id: options ? options.id : undefined,
            clientId: options ? options.clientId : undefined,
            timeStamp: options ? options.timeStamp : undefined,
            brush: options ? options.brush : undefined,
            points: options ? options.points : undefined
        }

        this._id = effectiveOptions.id ?? generateUniqueId();
        this._clientId = effectiveOptions.clientId;
        this._timeStamp = effectiveOptions.timeStamp ?? Date.now();
        this._points = effectiveOptions.points ?? [];
        this._brush = {...(effectiveOptions.brush ?? DefaultPenBrush)};
    }

    /**
     * Adds the specified points to the stroke. Points are added if they are
     * sufficiently far from each other.
     * @param points The points to add.
     * @returns `true` if at least one point was added, `false` otherwise.
     */
    addPoints(...points: IPointerPoint[]): boolean {
        let pointsAdded = false;

        for (let point of points) {
            if (this.addPoint(point)) {
                pointsAdded = true;
            }
        }

        return pointsAdded;
    }

    /**
     * Determines if the stroke intersects with the specified rectangle.
     * @param rectangle The rectangle to test against.
     * @returns `true` if the stroke intersects with `rectangle`, `false` otherwise.
     */
    intersectsWithRectangle(rectangle: IRect): boolean {
        let previousPoint: IPointerPoint | undefined = undefined;

        for (const p of this) {
            if (previousPoint) {
                const intersections = getSegmentIntersectionsWithRectangle(
                    { from: previousPoint, to: p },
                    rectangle);

                if (intersections.length > 0) {
                    return true;
                }
            }

            previousPoint = p;
        }

        return false;
    }

    /**
     * Computes the intersection points between the stroke and the specified segment.
     * @param segment The segment to test against.
     * @returns An array of intersection points.
     */
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

    /**
     * Computes the stroke's bounding rectangle. Once computed, the bounding rectangle
     * is cached until new points are added to the stroke.
     * @returns The stroke's bounding rectangle.
     */
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

    /**
     * Gets the point at the given index.
     * @param index The point index.
     * @returns The requested point.
     */
    getPointAt(index: number): IPointerPoint {
        return this._points[index];
    }

    /**
     * Splits this stroke into several other ones by "erasing" the portions that
     * are within the eraser rectangle.
     * @param eraserRect The eraser rectangle.
     * @returns An array of new strokes (which might be empty if the whole stroke
     * was erased), or `undefined` if the stroke was unchanged.
     */
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

        const createNewStroke: () => Stroke = () => {
            return new Stroke(
                {
                    clientId: this.clientId,
                    timeStamp: this.timeStamp,
                    brush: this.brush
                }
            );
        }

        let previousPoint: IPointerPoint | undefined = undefined;

        const generatedStrokes: IStroke[] = [];
        let currentStroke = createNewStroke();

        for (const p of this) {
            if (previousPoint) {
                const segment: ISegment = { from: previousPoint, to: p };
                
                if (segmentMayIntersectWithRectangle(segment, eraserRect)) {
                    const intersections = getSegmentIntersectionsWithRectangle(segment, eraserRect);

                    if (intersections.length === 1) {
                        // One intersection, we need to cut that segment into two
                        if (isPointInsideRectangle(previousPoint, eraserRect)) {
                            currentStroke = createNewStroke();

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

                        currentStroke = createNewStroke();
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

    /**
     * Serializes the stroke to a string.
     * @returns The serialized stroke.
     */
    serialize(): string {
        const data: IStrokeData = {
            id: this.id,
            clientId: this.clientId,
            timeStamp: this.timeStamp,
            brush: this.brush,
            points: this._points
        };

        return JSON.stringify(data);
    }

    /**
     * Deserializes the specified stroke string and sets thisstroke's brush,
     * points and other proprties accordingly.
     * @param serializedStroke The serialized stroke.
     */
    deserialize(serializedStroke: string) {
        const data: IStrokeData = JSON.parse(serializedStroke) as IStrokeData;

        this._id = data.id;
        this._clientId = data.clientId;
        this._timeStamp = data.timeStamp;
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

    /**
     * Gets the id of the stroke.
     */
    get id(): string {
        return this._id;
    }

    /**
     * Gets the id of the client the stroke was created on.
     */
    get clientId(): string | undefined {
        return this._clientId;
    }

    /**
     * Gets the time when the stroke was created.
     */
    get timeStamp(): number {
        return this._timeStamp;
    }

    /**
     * Gets the stroke's number of points.
     */
    get length(): number {
        return this._points.length;
    }

    /**
     * Gets the stroke's brush.
     */
    get brush(): IBrush {
        return this._brush;
    }
}