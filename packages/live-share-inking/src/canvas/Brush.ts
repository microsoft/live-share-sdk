/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { brightenColor } from "../core/Utils";

/**
 * Converts an IColor object into its CSS representation.
 * @param color The color to convert.
 * @returns A string representing the CSS representation of the color.
 */
export function toCssColor(color: IColor): string {
    return `rgba(${color.r},${color.g},${color.b},${color.a})`;
}

/**
 * Converts a CSS color expressed in the #RRGGBB[AA] format into an IColor object
 * @param color The CSS color to convert.
 * @returns The converted color as an IColor object, or a default color if the provided
 * color string isn't valid.
 */
export function fromCssColor(color: string): IColor {
    if (color) {
        const regEx = /#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})?/gi;
        const matches = regEx.exec(color);

        if (matches) {
            const r = parseInt(matches[1], 16);
            const g = parseInt(matches[2], 16);
            const b = parseInt(matches[3], 16);

            const a = matches[4] ? parseInt(matches[4], 16) / 255 : 1;

            return { r, g, b, a };
        }
    }

    return penColors.black;
}

/**
 * Defines an RGB color with an Alpha channel
 */
export interface IColor {
    readonly r: number; // 0 - 255
    readonly g: number; // 0 - 255
    readonly b: number; // 0 - 255
    readonly a: number; // 0.0 - 1.0
}

/**
 * Pre-defined basic colors
 */
export const basicColors = {
    black: fromCssColor("#000000"),
    white: fromCssColor("#ffffff"),
    red: fromCssColor("#ff0000"),
    green: fromCssColor("#00ff00"),
    blue: fromCssColor("#0000ff")
};

/**
 * Pre-defined pen colors
 */
export const penColors = {
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
    white: fromCssColor("#ffffff")
};

/**
 * Pre-defined highlighter colors
 */
export const highlighterColors = {
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
    black: fromCssColor("#000000")
};

/**
 * Defines the shape of a brush's tip.
 */
export type BrushTipShape = "ellipse" | "rectangle";

/**
 * Defines how a brush blends into the drawing.
 */
export type BrushBlendMode = "normal" | "darken";

/**
 * Defines a brush as used to draw strokes.
 */
export interface IBrush {
    /**
     * The main color of the brush.
     */
    color: IColor;
    /**
     * Optional. The fill color of the brush. When a fill color
     * is specified, strokes drawn using the brush use `color` as the
     * outline color and `fillColor` as the fill color.
     */
    fillColor?: IColor;
    /**
     * The shape of the brush's tip.
     */
    tip: BrushTipShape;
    /**
     * The size of the brush's tip. Must be greater than 0.
     */
    tipSize: number;
    /**
     * The brush's blen mode.
     */
    blendMode: BrushBlendMode;
}

/**
 * The default pen brush.
 */
export const DefaultPenBrush: Readonly<IBrush> = {
    color: penColors.black,
    tip: "ellipse",
    tipSize: 10,
    blendMode: "normal"
};

/**
 * The default highlighter brush.
 */
export const DefaultHighlighterBrush: IBrush = {
    color: highlighterColors.yellow,
    tip: "rectangle",
    tipSize: 10,
    blendMode: "darken"
};

/**
 * The default laser pointer brush.
 */
export const DefaultLaserPointerBrush: IBrush = {
    color: basicColors.red,
    fillColor: brightenColor(basicColors.red, 50),
    tip: "ellipse",
    tipSize: 10,
    blendMode: "normal"
};