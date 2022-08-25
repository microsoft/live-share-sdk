/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { basicColors, highlighterColors, IColor, penColors } from "./Colors";

/**
 * Defines the shape of a brush's tip.
 */
export type BrushTipShape = "ellipse" | "rectangle";

/**
 * Defines brush types.
 */
export type BrushType = "pen" | "highlighter" | "laser";

/**
 * Defines a brush as used to draw strokes.
 */
export interface IBrush {
    /**
     * The type of the brush.
     */
    type: BrushType,
    /**
     * The main color of the brush.
     */
    color: IColor;
    /**
     * The shape of the brush's tip.
     */
    tip: BrushTipShape;
    /**
     * The size of the brush's tip. Must be greater than 0.
     */
    tipSize: number;
}

/**
 * The default pen brush.
 */
export const DefaultPenBrush: Readonly<IBrush> = {
    type: "pen",
    color: penColors.black,
    tip: "ellipse",
    tipSize: 10
};

/**
 * The default highlighter brush.
 */
export const DefaultHighlighterBrush: IBrush = {
    type: "highlighter",
    color: highlighterColors.yellow,
    tip: "rectangle",
    tipSize: 10
};

/**
 * The default laser pointer brush.
 */
export const DefaultLaserPointerBrush: IBrush = {
    type: "laser",
    color: basicColors.red,
    tip: "ellipse",
    tipSize: 10
};