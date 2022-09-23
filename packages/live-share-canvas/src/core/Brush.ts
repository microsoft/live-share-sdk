/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { BasicColors, HighlighterColors, IColor, PenColors } from "./Colors";

/**
 * Defines the shape of a brush's tip.
 */
export type BrushTipShape = "ellipse" | "rectangle";

/**
 * Defines brush types.
 */
export type BrushType = "pen" | "highlighter" | "laser";

/**
 * 
 */
export type ArrowType = "none" | "open";

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
    /**
     * Optional. The type of arrow at the end of a line drawn with
     * the brush. Defaults to `none`.
     */
    endArrow?: ArrowType;
}

/**
 * The default pen brush.
 */
export const DefaultPenBrush: Readonly<IBrush> = {
    type: "pen",
    color: PenColors.black,
    tip: "ellipse",
    tipSize: 10
};

/**
 * The default line brush.
 */
export const DefaultLineBrush: Readonly<IBrush> = {
    type: "pen",
    color: PenColors.black,
    tip: "ellipse",
    tipSize: 10
};

/**
 * The default highlighter brush.
 */
export const DefaultHighlighterBrush: IBrush = {
    type: "highlighter",
    color: HighlighterColors.yellow,
    tip: "rectangle",
    tipSize: 10
};

/**
 * The default laser pointer brush.
 */
export const DefaultLaserPointerBrush: IBrush = {
    type: "laser",
    color: BasicColors.red,
    tip: "ellipse",
    tipSize: 10
};