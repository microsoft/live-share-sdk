import { BasicColors, lightenColor, toCssRgbaColor } from "../Colors.js";
import { IPoint, IRect, expandRect } from "../Geometry.js";
import { IUserInfo } from "../LiveCanvas-interfaces.js";
import { LiveCursor } from "../LiveCursor.js";
import { ICursorColor } from "./LiveCanvas-interfaces-internal.js";

/**
 * @internal
 */
export class BuiltInLiveCursor extends LiveCursor {
    private static currentColorIndex = 0;

    private _color: ICursorColor;
    private _arrowPathData?: string;
    private _arrowBounds?: IRect;

    protected internalRender(): HTMLElement {
        const arrowPath: IPoint[] = [
            { x: 0, y: 0 },
            { x: 10, y: 30 },
            { x: 17, y: 17 },
            { x: 30, y: 10 },
        ];

        if (!this._arrowPathData || !this._arrowBounds) {
            this._arrowPathData = "";

            this._arrowBounds = {
                left: Number.MAX_VALUE,
                top: Number.MAX_VALUE,
                right: Number.MIN_VALUE,
                bottom: Number.MIN_VALUE,
            };

            for (let i = 0; i < arrowPath.length; i++) {
                const p = arrowPath[i];

                this._arrowBounds = expandRect(this._arrowBounds, p);

                this._arrowPathData += `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `;
            }

            this._arrowPathData += "Z";
        }

        const arrowWidth = this._arrowBounds.right - this._arrowBounds.left;
        const arrowHeight = this._arrowBounds.bottom - this._arrowBounds.top;
        const arrowStrokeWidth = 10;

        const textColor = toCssRgbaColor(this._color.textColor);
        const arrowBorderColor = toCssRgbaColor(
            lightenColor(this._color.backgroundColor, 80)
        );
        const backgroundColor = toCssRgbaColor(this._color.backgroundColor);

        let visualTemplate = `
            <svg viewbox="-${arrowStrokeWidth} -${arrowStrokeWidth} ${
                2 * arrowStrokeWidth + arrowWidth
            } ${2 * arrowStrokeWidth + arrowHeight}"
                width="${arrowWidth}" height="${arrowHeight}" style="filter: drop-shadow(0px 0px 1px rgba(0, 0, 0, .7)">
                <path d="${
                    this._arrowPathData
                }" stroke="${arrowBorderColor}" stroke-width="10" stroke-linejoin="round" stroke-opacity="0.90"/>
                <path d="${
                    this._arrowPathData
                }" fill="${backgroundColor}" stroke="${backgroundColor}" stroke-width="2" stroke-linejoin="round"/>
            </svg>`;

        if (this.userInfo) {
            if (this.userInfo.displayName && !this.userInfo.pictureUri) {
                visualTemplate += `
                    <div style="display: flex; align-items: center; box-shadow: 0 0 2px black; background-color: ${backgroundColor};
                        height: ${arrowHeight}px; color: ${textColor}; border-radius: ${
                            arrowHeight / 2
                        }px / 50%;
                        border-top-left-radius: 4px; padding: 2px 8px; margin: ${
                            arrowHeight * 0.75
                        }px 0 0 -${arrowWidth * 0.25}px;
                        white-space: nowrap; font-size: 12px; font-family: sans-serif">
                        ${this.userInfo.displayName}
                    </div>`;
            } else if (this.userInfo.pictureUri && !this.userInfo.displayName) {
                visualTemplate += `
                    <img src="${this.userInfo.pictureUri}" style="width: ${
                        arrowHeight * 1.1
                    }px; height: ${arrowHeight * 1.1}px;
                        border-radius: 50%; box-shadow: 0 0 2px black;
                        margin: ${arrowHeight * 0.75}px 0 0 -${
                            arrowWidth * 0.25
                        }px;">`;
            } else if (this.userInfo.pictureUri && this.userInfo.displayName) {
                visualTemplate += `
                    <div style="display: flex; flex-direction: row; align-items: center; background-color: ${backgroundColor}; color: ${textColor};
                        border-radius: ${arrowHeight / 2}px / 50%; margin: ${
                            arrowHeight * 0.75
                        }px 0 0 -${arrowWidth * 0.25}px;
                        padding: 2px; white-space: nowrap; font-size: 12px; font-family: sans-serif; box-shadow: 0 0 2px black">
                        <img src="${this.userInfo.pictureUri}" style="width: ${
                            arrowHeight * 1.1
                        }px; height: ${arrowHeight * 1.1}px; border-radius: 50%;">
                        <div style="padding: 0 8px">${
                            this.userInfo.displayName
                        }</div>
                    </div>`;
            }
        }

        const template = document.createElement("template");
        template["innerHTML"] = visualTemplate;

        const element = document.createElement("div");
        element.style.position = "absolute";
        element.style.display = "flex";
        element.style.flexDirection = "row";

        element.appendChild(template.content.cloneNode(true));

        return element;
    }

    constructor(
        public clientId: string,
        _userInfo?: IUserInfo
    ) {
        const cursorColors: ICursorColor[] = [
            { backgroundColor: BasicColors.red, textColor: BasicColors.white },
            {
                backgroundColor: BasicColors.green,
                textColor: BasicColors.white,
            },
            { backgroundColor: BasicColors.blue, textColor: BasicColors.white },
            {
                backgroundColor: BasicColors.purple,
                textColor: BasicColors.white,
            },
            {
                backgroundColor: BasicColors.magenta,
                textColor: BasicColors.white,
            },
            {
                backgroundColor: BasicColors.violet,
                textColor: BasicColors.white,
            },
            { backgroundColor: BasicColors.gray, textColor: BasicColors.white },
            {
                backgroundColor: BasicColors.silver,
                textColor: BasicColors.black,
            },
        ];
        super(clientId, _userInfo);

        this._color = cursorColors[BuiltInLiveCursor.currentColorIndex];

        BuiltInLiveCursor.currentColorIndex++;

        if (BuiltInLiveCursor.currentColorIndex >= cursorColors.length) {
            BuiltInLiveCursor.currentColorIndex = 0;
        }
    }
}
