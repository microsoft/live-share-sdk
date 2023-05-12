/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { forceIntoRange } from "./internals";

/**
 * Defines an RGB color
 */
export interface IColor {
    readonly r: number; // 0 - 255
    readonly g: number; // 0 - 255
    readonly b: number; // 0 - 255
}

/**
 * Converts an IColor object into its CSS rgba() representation.
 * @param color The color to convert.
 * @returns A string representing the CSS rgba() representation of the color.
 */
export function toCssRgbaColor(color: IColor, alpha: number = 1): string {
    const r = forceIntoRange(color.r, 0, 255);
    const g = forceIntoRange(color.g, 0, 255);
    const b = forceIntoRange(color.b, 0, 255);
    const a = forceIntoRange(alpha, 0, 1);

    return `rgba(${r},${g},${b},${a})`;
}

/**
 * Converts a CSS color expressed in the #RRGGBB format into an IColor object
 * @param color The CSS color to convert.
 * @returns The converted color as an IColor object, or a default color if the provided
 * color string isn't valid.
 */
export function fromCssColor(color: string): IColor {
    if (color) {
        const regEx = /#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})/gi;
        const matches = regEx.exec(color);

        if (matches) {
            const r = parseInt(matches[1], 16);
            const g = parseInt(matches[2], 16);
            const b = parseInt(matches[3], 16);

            return { r, g, b };
        }
    }

    return PenColors.black;
}

/**
 * Lightens the given color by a certain intensity.
 * @param color The color to lighten.
 * @param intensity The intensity of the lightening. Must be between 0 and 100.
 * @returns The lightened color.
 */
export function lightenColor(color: IColor, intensity: number): IColor {
    if (intensity < 0 || intensity > 100) {
        return color;
    }

    const lightenChannel = (channel: number) => {
        const delta = 255 - channel;

        return channel + Math.round((delta / 100) * intensity);
    };

    return {
        r: lightenChannel(color.r),
        g: lightenChannel(color.g),
        b: lightenChannel(color.b),
    };
}

/**
 * Darkens the given color by a certain intensity.
 * @param color The color to darken.
 * @param intensity The intensity of the darkening. Must be between 0 and 100.
 * @returns The darkened color.
 */
export function darkenColor(color: IColor, intensity: number): IColor {
    if (intensity < 0 || intensity > 100) {
        return color;
    }

    const darkenChannel = (channel: number) => {
        const delta = 255 - channel;

        return channel - Math.round((channel / 100) * intensity);
    };

    return {
        r: darkenChannel(color.r),
        g: darkenChannel(color.g),
        b: darkenChannel(color.b),
    };
}

/**
 * Pre-defined basic colors
 */
export const BasicColors = {
    black: fromCssColor("#000000"),
    white: fromCssColor("#ffffff"),
    gray: fromCssColor("#808080"),
    silver: fromCssColor("#c0c0c0"),
    red: fromCssColor("#ff0000"),
    green: fromCssColor("#008000"),
    blue: fromCssColor("#0000ff"),
    yellow: fromCssColor("#ffff00"),
    magenta: fromCssColor("#ea33f6"),
    violet: fromCssColor("#8719cc"),
    purple: fromCssColor("#76147d"),
};

/**
 * Pre-defined pen colors
 */
export const PenColors = {
    yellow: fromCssColor("#ffc114"),
    orange: fromCssColor("#f6630d"),
    pink: fromCssColor("#ff0066"),
    red: fromCssColor("#e71224"),
    indigo: fromCssColor("#5b2d90"),
    purple: fromCssColor("#ab008b"),
    plum: fromCssColor("#cc0066"),
    darkBlue: fromCssColor("#004f8b"),
    skyBlue: fromCssColor("#00a0d7"),
    lightBlue: fromCssColor("#33ccff"),
    green: fromCssColor("#008c3a"),
    lightGreen: fromCssColor("#66cc00"),
    black: fromCssColor("#000000"),
    darkGray: fromCssColor("#333333"),
    lightGray: fromCssColor("#849398"),
    white: fromCssColor("#ffffff"),
};

/**
 * Pre-defined highlighter colors
 */
export const HighlighterColors = {
    yellow: fromCssColor("#fffc00"),
    lime: fromCssColor("#00f900"),
    aqua: fromCssColor("#00fdff"),
    Pink: fromCssColor("#ff40ff"),
    orange: fromCssColor("#ff8517"),
    lightGreen: fromCssColor("#a2d762"),
    paleBlue: fromCssColor("#a9d8ff"),
    rose: fromCssColor("#ffacd5"),
    crimson: fromCssColor("#ef0c4d"),
    green: fromCssColor("#00b44b"),
    blue: fromCssColor("#0069af"),
    lavender: fromCssColor("#d9aeff"),
    red: fromCssColor("#ff2500"),
    lightGray: fromCssColor("#e6e6e6"),
    gray: fromCssColor("#969696"),
    black: fromCssColor("#000000"),
};
