/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IBrush, DefaultPenBrush } from "./Brush";
import {
    getSquaredDistanceBetweenPoints,
    IPoint,
    IPointerPoint,
    IRect,
    ISegment,
    expandRect,
} from "./Geometry";
import {
    doRectanglesOverlap,
    getSegmentIntersectionsWithRectangle,
    getSegmentsIntersection,
    isPointInsideRectangle,
    isRectangleInsideRectangle,
    segmentMayIntersectWithRectangle,
    generateUniqueId,
} from "./internals";

/**
 * Field names on this interface are intentionally short to minimize
 * the mount of data in a serialized stroke.
 */
interface ISerializedStrokeData {
    /**
     * Version
     */
    v: number;
    /**
     * Id
     */
    id: string;
    /**
     * Client Id
     */
    cId?: string;
    /**
     * Timestamp
     */
    t: number;
    /**
     * Brush
     */
    br: IBrush;
    /**
     * Data, i.e. serialized point array
     */
    d: string;
}

/**
 * Stroke modes.
 */
export enum StrokeMode {
    /**
     * A freehand stroke that follows a path.
     */
    freeHand = 0,
    /**
     * A straight line stroke between two points.
     */
    line = 1,
}

/**
 * Stroke types.
 */
export enum StrokeType {
    /**
     * Laser pointer stroke, with a vanishing tail.
     */
    laserPointer = 0,
    /**
     * Ephemeral stroke, which vanishes all at once after
     * a set amount of time.
     */
    ephemeral = 1,
    /**
     * Persistent stroke, that remains on the canvas until
     * erased.
     */
    persistent = 2,
}

/**
 * Represents the raw data of a stroke.
 */
export interface IRawStroke {
    /**
     * The stroke's points.
     */
    readonly points: IPointerPoint[];
    /**
     * The brush used to draw the stroke.
     */
    readonly brush: IBrush;
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
     * Gets a copy of all the points in the stroke.
     */
    getAllPoints(): IPointerPoint[];
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
     * Serialize points
     */
    serializePoints(): string;
    /**
     * Version
     */
    readonly version: number;
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
    version?: number;
    clientId?: string;
    timeStamp?: number;
    brush?: IBrush;
    points?: IPointerPoint[];
}

/**
 * Represents a concrete stroke object.
 */
export class Stroke implements IStroke, Iterable<IPointerPoint> {
    private static readonly coordinateSerializationPrecision = 1;
    private static readonly pressureSerializationPrecision = 2;
    private _version: number = 1;

    // Version is fixed at 1 for now. If/when we evolve the structure
    // of a stroke, we'll update the version number and the
    // serialization/deserialization logic
    get version(): number {
        return this._version;
    }

    private _brush: IBrush = { ...DefaultPenBrush };
    private _points: IPointerPoint[];
    private _iteratorCounter = 0;
    private _id: string;
    private _clientId?: string;
    private _timeStamp: number;
    private _boundingRect?: IRect;

    /**
     * In order to reduce the amount of data a serialized stroke uses, points
     * are serialized in a minimal way:
     * - Each point is represented in the X,Y,Pressure format
     * - Coordinates are rounded to the number of decimals configured via
     * `Stroke.coordinateSerializationPrecision`
     * - Pressures are rounded to the number of decimals configured via
     * `Stroke.pressureSerializationPrecision`
     * - All X, Y and P are expressed as integers. This allows to not use a
     * decimal point which saves three characters per point
     *
     * @returns The serialized points.
     */
    public serializePoints(): string {
        let result = "";

        const coordinateMultiplier = Math.pow(
            10,
            Stroke.coordinateSerializationPrecision
        );
        const pressureMultiplier = Math.pow(
            10,
            Stroke.pressureSerializationPrecision
        );

        for (let i = 0; i < this._points.length; i++) {
            const p = this._points[i];

            result += `${(p.x * coordinateMultiplier).toFixed(0)},${(
                p.y * coordinateMultiplier
            ).toFixed(0)},${(p.pressure * pressureMultiplier).toFixed(0)}`;

            if (i < this._points.length - 1) {
                result += ",";
            }
        }

        return result;
    }

    private deserializePoints(serializedPoints: string): IPointerPoint[] {
        const result: IPointerPoint[] = [];

        const coordinateMultiplier = Math.pow(
            10,
            Stroke.coordinateSerializationPrecision
        );
        const pressureMultiplier = Math.pow(
            10,
            Stroke.pressureSerializationPrecision
        );

        let currentPosition = 0;
        let currentValues: number[] = [];

        while (currentPosition < serializedPoints.length) {
            let p = serializedPoints.indexOf(",", currentPosition);

            if (p === -1) {
                p = serializedPoints.length;
            }

            currentValues.push(
                parseFloat(serializedPoints.substring(currentPosition, p))
            );

            if (currentValues.length === 3) {
                const point: IPointerPoint = {
                    x: currentValues[0] / coordinateMultiplier,
                    y: currentValues[1] / coordinateMultiplier,
                    pressure: currentValues[2] / pressureMultiplier,
                };

                result.push(point);

                currentValues = [];
            }

            currentPosition = p + 1;
        }

        return result;
    }

    protected addPoint(p: IPointerPoint): boolean {
        let lastPoint =
            this._points.length > 0
                ? this._points[this._points.length - 1]
                : undefined;

        if (
            lastPoint === undefined ||
            lastPoint.x !== p.x ||
            lastPoint.y !== p.y
        ) {
            this._points.push(p);

            if (
                this._boundingRect &&
                !isPointInsideRectangle(p, this._boundingRect)
            ) {
                this._boundingRect = undefined;
            }

            return true;
        }

        return false;
    }

    /**
     * Creates a new Stroke instance.
     * @param options Optional creation options such as id, points, etc.
     */
    constructor(options?: IStrokeCreationOptions) {
        const effectiveOptions: IStrokeCreationOptions = {
            id: options?.id,
            clientId: options?.clientId,
            timeStamp: options?.timeStamp,
            brush: options?.brush,
            points: options?.points,
            version: options?.version ?? 1,
        };

        this._id = effectiveOptions.id ?? generateUniqueId();
        this._clientId = effectiveOptions.clientId;
        this._timeStamp = effectiveOptions.timeStamp ?? Date.now();
        this._points = effectiveOptions.points ?? [];
        this._brush = { ...(effectiveOptions.brush ?? DefaultPenBrush) };
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
     * CLears the stroke, i.e. removes all of its points.
     */
    clear() {
        this._points = [];
        this._boundingRect = undefined;
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
                    rectangle
                );

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
                const intersection = getSegmentsIntersection(segment, {
                    from: previousPoint,
                    to: p,
                });

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
            let result = {
                left: Number.MAX_VALUE,
                top: Number.MAX_VALUE,
                right: -Number.MAX_VALUE,
                bottom: -Number.MAX_VALUE,
            };

            for (const p of this) {
                result = expandRect(result, p);
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
     * Gets a copy of all the points in the stroke.
     * @returns A collection of points.
     */
    getAllPoints(): IPointerPoint[] {
        const result: IPointerPoint[] = [];

        for (const p of this._points) {
            result.push({ ...p });
        }

        return result;
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

        if (this.length === 1) {
            if (isPointInsideRectangle(this.getPointAt(0), eraserRect)) {
                // The single point stroke is inside the eraser rectangle, so the whole
                // stroke needs to be erased
                return [];
            } else {
                // The single point stroke is outside the eraser rectangle, so there's
                // nothing to erase
                return undefined;
            }
        }

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
            return new Stroke({
                clientId: this.clientId,
                timeStamp: this.timeStamp,
                brush: this.brush,
                version: this.version,
            });
        };

        let previousPoint: IPointerPoint | undefined = undefined;

        const generatedStrokes: IStroke[] = [];
        let currentStroke = createNewStroke();

        for (const p of this) {
            if (previousPoint) {
                const segment: ISegment = { from: previousPoint, to: p };

                if (segmentMayIntersectWithRectangle(segment, eraserRect)) {
                    const intersections = getSegmentIntersectionsWithRectangle(
                        segment,
                        eraserRect
                    );

                    if (intersections.length === 1) {
                        // One intersection, we need to cut that segment into two
                        if (isPointInsideRectangle(previousPoint, eraserRect)) {
                            currentStroke = createNewStroke();

                            currentStroke.addPoint({
                                ...intersections[0],
                                pressure: previousPoint.pressure,
                            });
                            currentStroke.addPoint(p);
                        } else {
                            currentStroke.addPoint({
                                ...intersections[0],
                                pressure: p.pressure,
                            });

                            generatedStrokes.push(currentStroke);

                            currentStroke = createNewStroke();
                        }
                    } else if (intersections.length === 2) {
                        // Two intersections, we need to cut the part that's inside the eraser rectangle
                        const d1 = getSquaredDistanceBetweenPoints(
                            previousPoint,
                            intersections[0]
                        );
                        const d2 = getSquaredDistanceBetweenPoints(
                            previousPoint,
                            intersections[1]
                        );

                        let [firstIndex, secondIndex] =
                            d1 < d2 ? [0, 1] : [1, 0];

                        currentStroke.addPoint({
                            ...intersections[firstIndex],
                            pressure: previousPoint.pressure,
                        });

                        generatedStrokes.push(currentStroke);

                        currentStroke = createNewStroke();
                        currentStroke.addPoint({
                            ...intersections[secondIndex],
                            pressure: previousPoint.pressure,
                        });
                        currentStroke.addPoint(p);
                    } else if (
                        !isPointInsideRectangle(previousPoint, eraserRect) &&
                        !isPointInsideRectangle(p, eraserRect)
                    ) {
                        // The segment is fully outside the eraser rectangle, we keep it and add it to the current stroke
                        if (currentStroke.length === 0) {
                            currentStroke.addPoint(previousPoint);
                        }

                        currentStroke.addPoint(p);
                    }
                } else {
                    currentStroke.addPoint(p);
                }
            } else {
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
        const strokeData: ISerializedStrokeData = {
            v: this.version,
            id: this.id,
            cId: this.clientId,
            t: this.timeStamp,
            br: this.brush,
            d: this.serializePoints(),
        };

        return JSON.stringify(strokeData);
    }

    /**
     * Deserializes the specified stroke string and sets this stroke's brush,
     * points and other proprties accordingly.
     * @param serializedStroke The serialized stroke.
     */
    deserialize(serializedStroke: string) {
        const strokeData: ISerializedStrokeData = JSON.parse(
            serializedStroke
        ) as ISerializedStrokeData;

        this._version = strokeData.v;
        this._id = strokeData.id;
        this._clientId = strokeData.cId;
        this._timeStamp = strokeData.t;
        this._brush = strokeData.br;
        this._points = this.deserializePoints(strokeData.d);
    }

    [Symbol.iterator]() {
        this._iteratorCounter = 0;

        return {
            next: () => {
                return {
                    done: this._iteratorCounter === this._points.length,
                    value: this._points[this._iteratorCounter++],
                };
            },
        };
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
