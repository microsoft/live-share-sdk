/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { isInRange } from "./Utils";

/**
 * @hidden
 */
export const TWO_PI: number = Math.PI * 2;

/**
 * Defines a 2D point.
 */
export interface IPoint {
    x: number,
    y: number
}

/**
 * Defines a 2D point with pointer pressure.
 */
export interface IPointerPoint extends IPoint {
    pressure: number
}

/**
 * Defines a segment between two points.
 */
export interface ISegment {
    from: IPoint,
    to: IPoint
}

/**
 * Defines a rectangle.
 */
export interface IRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/**
 * Adjusts a size given a pointer pressure.
 * @param baseSize The size to adjust.
 * @param pressure The pressure.
 * @returns The adjusted size.
 */
export function getPressureAdjustedSize(baseSize: number, pressure: number): number {
    return baseSize * (pressure * 1.5 + 0.25);
}

/**
 * Extends the dimensions of the specified rectangle so it contains the specified point.
 * @param rect The rectangle to extend.
 * @param point The point to extend the rectangle to.
 */
export function unionRect(rect: IRect, point: IPoint): void {
    rect.left = Math.min(rect.left, point.x);
    rect.right = Math.max(rect.right, point.x);
    rect.top = Math.min(rect.top, point.y);
    rect.bottom = Math.max(rect.bottom, point.y);
}

/**
 * Defines a quad, i.e. a polygon with 4 sides.
 */
export interface IQuad {
    p1: IPoint;
    p2: IPoint;
    p3: IPoint;
    p4: IPoint;
}

/**
 * @hidden
 */
export interface IQuadPathItem {
    quad?: IQuad,
    endPoint: IPointerPoint;
    tipSize: number;
}

/**
 * @hidden
 * Computes a quad between two circles.
 * @param center1 The center of the first circle.
 * @param r1 The radius of the first circle.
 * @param center2 The center of the second circle.
 * @param r2 The radius of the second circle.
 * @returns A quad joining the two circles, or undefined if the quad couldn't be computed.
 */
export function computeQuadBetweenTwoCircles(
    center1: IPoint,
    r1: number,
    center2: IPoint,
    r2: number
): IQuad | undefined {
    // output point sequence: if viewing the two circles from below,
    // with the first circle on the left,
    // the first point should be the upper tangent point on the first circle
    const diffX: number = center2.x - center1.x;
    const diffY: number = center2.y - center1.y;
    const distance: number = Math.sqrt(diffX * diffX + diffY * diffY);

    if (distance <= Math.abs(r2 - r1)) {
        return undefined;
    }

    const cosTheta: number = diffX / distance;
    const sinTheta: number = -diffY / distance;
    const sinDelta: number = (r2 - r1) / distance;
    const cosDelta: number = Math.sqrt(1 - sinDelta * sinDelta);
    const sinAlpha: number = sinTheta * cosDelta + cosTheta * sinDelta;
    const cosAlpha: number = cosTheta * cosDelta - sinTheta * sinDelta;
    const sinBeta: number = sinTheta * cosDelta - cosTheta * sinDelta;
    const cosBeta: number = cosTheta * cosDelta + sinTheta * sinDelta;

    return {
        p1: { x: center1.x - sinAlpha * r1, y: center1.y - cosAlpha * r1 },
        p2: { x: center2.x - sinAlpha * r2, y: center2.y - cosAlpha * r2 },
        p3: { x: center2.x + sinBeta * r2, y: center2.y + cosBeta * r2 },
        p4: { x: center1.x + sinBeta * r1, y: center1.y + cosBeta * r1 }
    }
}

/**
 * @hidden
 * Computes a quad between the specified rectangles.
 * @param center1 The center of the first rectangle.
 * @param halfWidth1 The half width of the first rectangle.
 * @param halfHeight1 The half height of the first rectangle.
 * @param center2 The center of the second rectangle.
 * @param halfWidth2 The half width of the second rectangle.
 * @param halfHeight2 The half height of the second rectangle.
 * @returns A quad joining the two rectangles, or undefined if the quad couldn't be computed.
 */
export function computeQuadBetweenTwoRectangles(
    center1: IPoint,
    halfWidth1: number,
    halfHeight1: number,
    center2: IPoint,
    halfWidth2: number,
    halfHeight2: number
): IQuad | undefined {
    const left1: number = center1.x - halfWidth1;
    const top1: number = center1.y - halfHeight1;
    const right1: number = center1.x + halfWidth1;
    const bottom1: number = center1.y + halfHeight1;
    const left2: number = center2.x - halfWidth2;
    const top2: number = center2.y - halfHeight2;
    const right2: number = center2.x + halfWidth2;
    const bottom2: number = center2.y + halfHeight2;
    
    if (
        (left2 >= left1 && top2 >= top1 && right2 <= right1 && bottom2 <= bottom1) ||
        (left1 >= left2 && top1 >= top2 && right1 <= right2 && bottom1 <= bottom2)
    ) {
        return undefined; // one rectangle contains the other or they are the same
    }

    const signDeltaX: number = center2.x - center1.x > 0 ? 1 : -1;
    const signDeltaY: number = center2.y - center1.y > 0 ? 1 : -1;

    return {
        p1: { x: center1.x - signDeltaY * halfWidth1, y: center1.y + signDeltaX * halfHeight1 },
        p2: { x: center1.x + signDeltaY * halfWidth1, y: center1.y - signDeltaX * halfHeight1 },
        p3: { x: center2.x + signDeltaY * halfWidth2, y: center2.y - signDeltaX * halfHeight2 },
        p4: { x: center2.x - signDeltaY * halfWidth2, y: center2.y + signDeltaX * halfHeight2 }
    }
}

/**
 * @hidden
 * Makes a rectangle of the specified width and height from the specified center.
 * @param center The center of the rectangle.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @returns The computed rectangle.
 */
export function makeRectangle(center: IPoint, width: number, height: number): IRect {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return {
        left: center.x - halfWidth,
        top: center.y - halfHeight,
        right: center.x + halfWidth,
        bottom: center.y + halfHeight
    };
}

/**
 * @hidden
 * Determines if the specified point is inside the specified rectangle.
 * @param p The point.
 * @param r The rectangle.
 * @returns `true` if `p` is inside `r`, `false` otherwise.
 */
export function isPointInsideRectangle(p: IPoint, r: IRect): boolean {
    return isInRange(p.x, r.left, r.right) && isInRange(p.y, r.top, r.bottom);
}

/**
 * @hidden
 * Determines if a rectangle is inside another.
 * @param r The rectangle to check the includion of.
 * @param containingRectangle The containing rectangle.
 * @returns `true` is `r` is inside `containingRectangle`, `false` otherwise.
 */
export function isRectangleInsideRectangle(r: IRect, containingRectangle: IRect): boolean {
    const topLeft = { x: r.left, y: r.top };
    const topRight = { x: r.right, y: r.top };
    const bottomLeft = { x: r.left, y: r.bottom };
    const bottomRight = { x: r.right, y: r.bottom };

    return isPointInsideRectangle(topLeft, containingRectangle) &&
        isPointInsideRectangle(topRight, containingRectangle) &&
        isPointInsideRectangle(bottomLeft, containingRectangle) &&
        isPointInsideRectangle(bottomRight, containingRectangle);
}

/**
 * @hidden
 * Determines if two rectangles overlap.
 * @param r1 The first rectangle.
 * @param r2 The second rectangle.
 * @returns `true` if the two rectabgles overlap, `false` otherwise.
 */
export function doRectanglesOverlap(r1: IRect, r2: IRect): boolean {
    const test = (r1: IRect, r2: IRect) => {
        const topLeft = { x: r1.left, y: r1.top };
        const topRight = { x: r1.right, y: r1.top };
        const bottomLeft = { x: r1.left, y: r1.bottom };
        const bottomRight = { x: r1.right, y: r1.bottom };

        return isPointInsideRectangle(topLeft, r2) ||
            isPointInsideRectangle(topRight, r2) ||
            isPointInsideRectangle(bottomLeft, r2) ||
            isPointInsideRectangle(bottomRight, r2);
    }

    return test(r1, r2) || test(r2, r1);
}

/**
 * @hidden
 * Determines whether two segments MAY intersect, which doesn't mean they DO intersect.
 * Computing the intersection of two segments is computationally expensive; this method
 * provides a way to not have to do it unless it's actually necessary.
 * @param segment1 The first segment.
 * @param segment2 The second segment.
 * @returns `true` is the two segments may intersect, `false` otherwise.
 */
export function segmentsMayIntersect(segment1: ISegment, segment2: ISegment): boolean {
    const s1: ISegment = {
        from: {
            x: Math.min(segment1.from.x, segment1.to.x),
            y: Math.min(segment1.from.y, segment1.to.y)
        },
        to: {
            x: Math.max(segment1.from.x, segment1.to.x),
            y: Math.max(segment1.from.y, segment1.to.y)
        }
    };

    const s2: ISegment = {
        from: {
            x: Math.min(segment2.from.x, segment2.to.x),
            y: Math.min(segment2.from.y, segment2.to.y)
        },
        to: {
            x: Math.max(segment2.from.x, segment2.to.x),
            y: Math.max(segment2.from.y, segment2.to.y)
        }
    }

    return !(s1.to.x < s2.from.x || s1.from.x > s2.to.x || s1.to.y < s2.from.y || s1.from.y > s2.to.y);
}

/**
 * @hidden
 * Computes a rectangle's side segments
 * @param rect The rectangles to get the segments of.
 * @returns The 4 segments representing the rectangle's 4 sides.
 */
export function getRectangleSegments(rect: IRect): ISegment[] {
    return [
        { from: { x: rect.left, y: rect.top}, to: { x: rect.right, y: rect.top} },
        { from: { x: rect.right, y: rect.top}, to: { x: rect.right, y: rect.bottom} },
        { from: { x: rect.right, y: rect.bottom}, to: { x: rect.left, y: rect.bottom} },
        { from: { x: rect.left, y: rect.bottom}, to: { x: rect.left, y: rect.top} }
    ];
}

/**
 * @hidden
 * Determines if the specified segment MAY intersect with any of the specified rectangle's
 * sides, which doesn't mean that it DOES intersect. Computing the intersection between
 * segments is computationally expensive; this method provides a way to not have to do it
 * unless it's actually necessary.
 * @param segment The segment.
 * @param rect The rectangle.
 * @returns `true` is `segment` may intersect with `rect`, `false` otherwise.
 */
export function segmentMayIntersectWithRectangle(segment: ISegment, rect: IRect): boolean {
    const rectSegments = getRectangleSegments(rect);

    for (let s of rectSegments) {
        if (segmentsMayIntersect(segment, s)) {
            return true;
        }
    }

    return false;
}

/**
 * @hidden
 * Computes the intersection point between two segments.
 * From https://gamedev.stackexchange.com/questions/111100/intersection-of-a-line-segment-and-a-rectangle
 * @param s1 The first segment.
 * @param s2 The second segment.
 * @returns The intersection point, or undefined if the segments do not intersect.
 */
export function getSegmentsIntersection(s1: ISegment, s2: ISegment): IPoint | undefined {
    const a1 = s1.to.y - s1.from.y;
    const b1 = s1.from.x - s1.to.x;
    const a2 = s2.to.y - s2.from.y;
    const b2 = s2.from.x - s2.to.x;

    const delta = a1 * b2 - a2 * b1;

    if (delta === 0) {
        return undefined;
    }

    const c1 = a2 * s2.from.x + b2 * s2.from.y;
    const c2 = a1 * s1.from.x + b1 * s1.from.y;

    const invDelta = 1 / delta;

    const potentialResult = { x: (b2 * c2 - b1 * c1) * invDelta, y: (a1 * c1 - a2 * c2) * invDelta };

    if (isInRange(potentialResult.x, s1.from.x, s1.to.x) &&
        isInRange(potentialResult.x, s2.from.x, s2.to.x) &&
        isInRange(potentialResult.y, s1.from.y, s1.to.y) &&
        isInRange(potentialResult.y, s2.from.y, s2.to.y)) {
        return potentialResult;
    }

    return undefined;
}

/**
 * @hidden
 * Determines the intersection points between the specified segment and the sides of the
 * specified rectangle.
 * @param s The segment.
 * @param r The rectangle.
 * @returns An array containing 0, 1 or 2 intersection points.
 */
export function getSegmentIntersectionsWithRectangle(s: ISegment, r: IRect): IPoint[] {
    const result: IPoint[] = [];
    const rectSegments = getRectangleSegments(r);

    for (let otherSegment of rectSegments) {
        const intersection = getSegmentsIntersection(s, otherSegment);

        if (intersection) {
            let isDuplicate = false;

            for (const p of result) {
                if (p.x === intersection.x && p.y === intersection.y) {
                    isDuplicate = true;

                    break;
                }
            }

            if (!isDuplicate) {
                result.push(intersection);
            }
        }
    }

    return result;
}

/**
 * Computes the distance between two points.
 * @param p1 The first point.
 * @param p2 The second point.
 * @returns The distance between `p1` and `p2`.
 */
export function getDistanceBetweenPoints(p1: IPoint, p2: IPoint): number {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Converts screen coordinates to viewport coordinates.
 * @param p The point to convert.
 * @param viewportReferencePoint The videwport's reference point.
 * @param viewportOffset The viewport offset.
 * @param scale The viewport scale. Defaults to 1 if the provided value is less than or equal to 0.
 * @returns The converted point.
 */
export function screenToViewport(p: IPoint, viewportReferencePoint: IPoint, viewportOffset: IPoint, scale: number): IPoint {
    const effectiveScale = scale > 0 ? scale : 1;

    return {
        x: (p.x - viewportOffset.x - viewportReferencePoint.x) / effectiveScale,
        y: (p.y - viewportOffset.y - viewportReferencePoint.y) / effectiveScale
    };
}

/**
 * Converts viewport coordinates to screen coordinates.
 * @param p The point to convert.
 * @param viewportReferencePoint The videwport's reference point.
 * @param viewportOffset The viewport offset.
 * @param scale The viewport scale. Defaults to 1 if the provided value is less than or equal to 0.
 * @returns The converted point.
 */
export function viewportToScreen(p: IPoint, viewportReferencePoint: IPoint, viewportOffset: IPoint, scale: number): IPoint {
    const effectiveScale = scale > 0 ? scale : 1;

    return {
        x: p.x * effectiveScale + viewportReferencePoint.x + viewportOffset.x,
        y: p.y * effectiveScale + viewportReferencePoint.y + viewportOffset.y
    };
}