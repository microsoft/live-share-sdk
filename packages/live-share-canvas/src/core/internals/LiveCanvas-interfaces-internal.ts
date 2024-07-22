import { IColor } from "../Colors";

export interface ISharedCursor {
    isCursorShared?: boolean;
}

export interface ICursorColor {
    readonly backgroundColor: IColor;
    readonly textColor: IColor;
}
