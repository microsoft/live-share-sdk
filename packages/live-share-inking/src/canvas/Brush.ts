/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

 import { brightenColor } from "../core/Utils";

export interface IColor {
    readonly r: number; // 0 - 255
    readonly g: number; // 0 - 255
    readonly b: number; // 0 - 255
    readonly a: number; // 0.0 - 1.0
}

export class Colors {
    public static readonly Black: IColor = { r: 0, g: 0, b: 0, a: 1 };
    public static readonly White: IColor = { r: 255, g: 255, b: 255, a: 1 };
    public static readonly Red: IColor = { r: 255, g: 0, b: 0, a: 1 };
    public static readonly Green: IColor = { r: 0, g: 255, b: 0, a: 1 };
    public static readonly Blue: IColor = { r: 0, g: 0, b: 255, a: 1 };
}

export type BrushTipShape = "ellipse" | "rectangle";
export type BrushBlendMode = "normal" | "darken";

export interface IBrush {
    color: IColor;
    fillColor?: IColor;
    tip: BrushTipShape;
    tipSize: number;
    blendMode: BrushBlendMode;
}

export const DefaultPenBrush: Readonly<IBrush> = {
    color: Colors.Black,
    tip: "ellipse",
    tipSize: 10,
    blendMode: "normal"
};

export const DefaultHighlighterBrush: IBrush = {
    color: { r: 255, g: 252, b: 0, a: 1 },
    tip: "rectangle",
    tipSize: 10,
    blendMode: "darken"
};

export const DefaultLaserPointerBrush: IBrush = {
    color: Colors.Red,
    fillColor: brightenColor(Colors.Red, 50),
    tip: "ellipse",
    tipSize: 10,
    blendMode: "normal"
};