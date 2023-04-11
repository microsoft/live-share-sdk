/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

/**
 * Defines a 2D point.
 */
export interface IPoint {
    x: number;
    y: number;
}

/**
 * Defines a 2D point with pointer pressure.
 */
export interface IPointerPoint extends IPoint {
    pressure: number;
}

/**
 * Defines a segment between two points.
 */
export interface ISegment {
    from: IPoint;
    to: IPoint;
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
export function getPressureAdjustedSize(
    baseSize: number,
    pressure: number
): number {
    return baseSize * (pressure * 1.5 + 0.25);
}

/**
 * Expands the specified rectangle so it contains the specified point.
 * @param rect The rectangle to extend.
 * @param point The point to extend the rectangle to.
 * @returns The expanded rectangle.
 */
export function expandRect(rect: IRect, point: IPoint): IRect {
    return {
        left: Math.min(rect.left, point.x),
        right: Math.max(rect.right, point.x),
        top: Math.min(rect.top, point.y),
        bottom: Math.max(rect.bottom, point.y),
    };
}

export function combineRects(rect1: IRect, rect2: IRect): IRect {
    return {
        left: Math.min(rect1.left, rect2.left),
        top: Math.min(rect1.top, rect2.top),
        right: Math.max(rect1.right, rect2.right),
        bottom: Math.max(rect1.bottom, rect2.bottom),
    };
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
 * Computes the square of the distance between two points. This provides a cheaper
 * way to compare multiple distances since it doesn't compute any square root.
 * @param p1 The first point.
 * @param p2 The second point.
 * @returns The square of the distance between `p1` and `p2`.
 */
export function getSquaredDistanceBetweenPoints(
    p1: IPoint,
    p2: IPoint
): number {
    return (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
}

/**
 * Converts screen coordinates to viewport coordinates.
 * @param p The point to convert.
 * @param viewportReferencePoint The videwport's reference point.
 * @param viewportOffset The viewport offset.
 * @param scale The viewport scale. Defaults to 1 if the provided value is less than or equal to 0.
 * @returns The converted point.
 */
export function screenToViewport(
    p: IPoint,
    viewportReferencePoint: IPoint,
    viewportOffset: IPoint,
    scale: number
): IPoint {
    const effectiveScale = scale > 0 ? scale : 1;

    return {
        x: (p.x - viewportOffset.x - viewportReferencePoint.x) / effectiveScale,
        y: (p.y - viewportOffset.y - viewportReferencePoint.y) / effectiveScale,
    };
}

/**
 * Converts viewport coordinates to screen coordinates.
 * @param p The point to convert.
 * @param viewportReferencePoint The viewport's reference point.
 * @param viewportOffset The viewport offset.
 * @param scale The viewport scale. Defaults to 1 if the provided value is less than or equal to 0.
 * @returns The converted point.
 */
export function viewportToScreen(
    p: IPoint,
    viewportReferencePoint: IPoint,
    viewportOffset: IPoint,
    scale: number
): IPoint {
    const effectiveScale = scale > 0 ? scale : 1;

    return {
        x: p.x * effectiveScale + viewportReferencePoint.x + viewportOffset.x,
        y: p.y * effectiveScale + viewportReferencePoint.y + viewportOffset.y,
    };
}
