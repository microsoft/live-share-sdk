/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

 import { isInRange } from "./Utils";

export const TWO_PI: number = Math.PI * 2;

export interface IPoint {
    x: number,
    y: number
}

export interface IPointerPoint extends IPoint {
    pressure: number
}

export interface ISegment {
    from: IPoint,
    to: IPoint
}

export interface IRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export function getPressureAdjustedTipSize(baseRadius: number, pressure: number) {
    return baseRadius * (pressure * 1.5 + 0.25);
}

export function unionRect(rect: IRect, point: IPoint): void {
    rect.left = Math.min(rect.left, point.x);
    rect.right = Math.max(rect.right, point.x);
    rect.top = Math.min(rect.top, point.y);
    rect.bottom = Math.max(rect.bottom, point.y);
}

export interface IQuad {
    p1: IPoint;
    p2: IPoint;
    p3: IPoint;
    p4: IPoint;
}

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

export function makeRectangleFromPoint(p: IPoint, width: number, height: number): IRect {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return {
        left: p.x - halfWidth,
        top: p.y - halfHeight,
        right: p.x + halfWidth,
        bottom: p.y + halfHeight
    };
}

export function isPointInsideRectangle(p: IPoint, r: IRect): boolean {
    return isInRange(p.x, r.left, r.right) && isInRange(p.y, r.top, r.bottom);
}

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

export function getRectangleSegments(rect: IRect): ISegment[] {
    return [
        { from: { x: rect.left, y: rect.top}, to: { x: rect.right, y: rect.top} },
        { from: { x: rect.right, y: rect.top}, to: { x: rect.right, y: rect.bottom} },
        { from: { x: rect.right, y: rect.bottom}, to: { x: rect.left, y: rect.bottom} },
        { from: { x: rect.left, y: rect.bottom}, to: { x: rect.left, y: rect.top} }
    ];
}

export function segmentMayIntersectWithRectangle(segment: ISegment, rect: IRect): boolean {
    const rectSegments = getRectangleSegments(rect);

    for (let s of rectSegments) {
        if (segmentsMayIntersect(segment, s)) {
            return true;
        }
    }

    return false;
}

// From https://gamedev.stackexchange.com/questions/111100/intersection-of-a-line-segment-and-a-rectangle
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

export function getDistanceBetweenPoints(p1: IPoint, p2: IPoint): number {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function screenToViewport(p: IPoint, viewportReferencePoint: IPoint, viewportOffset: IPoint, scale: number): IPoint {
    return {
        x: (p.x - viewportOffset.x - viewportReferencePoint.x) / scale,
        y: (p.y - viewportOffset.y - viewportReferencePoint.y) / scale
    };
}

export function viewportToScreen(p: IPoint, viewportReferencePoint: IPoint, viewportOffset: IPoint, scale: number): IPoint {
    return {
        x: p.x * scale + viewportReferencePoint.x + viewportOffset.x,
        y: p.y * scale + viewportReferencePoint.y + viewportOffset.y
    };
}