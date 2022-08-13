/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { v4 as uuid } from "uuid";
import { IColor } from "../canvas/Brush";
import { IPointerPoint } from "./Geometry";

const EPSILON = 0.000001;

/**
 * @hidden
 * Generates a unique Id.
 * @returns A unique Id.
 */
export function generateUniqueId(): string {
    return uuid();
}

/**
 * @hidden
 * Converts a PointerEvent into an IPointerPoint.
 * @param e The pointer event to convert.
 * @returns An IPointerPoint object.
 */
export function pointerEventToPoint(e: PointerEvent): IPointerPoint {
    return {
        x: e.offsetX,
        y: e.offsetY,
        pressure: e.pressure > 0 ? e.pressure : 0.5
    };
}

/**
 * @hidden
 * Brightens the given color by a certain intensity.
 * @param color The color to brighten.
 * @param intensity The intensity of the brightening. Must be between 0 and 100.
 * @returns The brightened color.
 */
export function brightenColor(color: IColor, intensity: number): IColor {
    if (intensity < 0 || intensity > 100) {
        return color;
    }

    const brightenChannel = (channel: number) => {
        const delta = 255 - channel;

        return channel + delta / 100 * intensity;
    }

    return {
        r: brightenChannel(color.r),
        g: brightenChannel(color.g),
        b: brightenChannel(color.b)
    }
}

/**
 * @hidden
 * Determines if a number is within a randge.
 * @param n The number to check.
 * @param r1 The first range boundary.
 * @param r2 The second range boundary.
 * @returns `true` if `n` is between `r1` and `r2`, `false` otherwise.
 */
export function isInRange(n: number, r1: number, r2: number): boolean {
    const adjustedMin = Math.min(r1, r2) - EPSILON;
    const adjustedMax = Math.max(r1, r2) + EPSILON;

    return n >= adjustedMin && n <= adjustedMax;
}