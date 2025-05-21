import { IColor } from "../Colors.js";

export interface ISharedCursor {
    isCursorShared?: boolean;
}

export interface ICursorColor {
    readonly backgroundColor: IColor;
    readonly textColor: IColor;
}
