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
    private static readonly svgNamespace = "http://www.w3.org/2000/svg";

    private _color: ICursorColor;
    private _arrowPathData?: string;
    private _arrowBounds?: IRect;

    private createArrowElement(
        arrowStrokeWidth: number,
        arrowWidth: number,
        arrowHeight: number,
        arrowBorderColor: string,
        backgroundColor: string
    ): SVGSVGElement {
        const svg = document.createElementNS(
            BuiltInLiveCursor.svgNamespace,
            "svg"
        );
        svg.setAttribute(
            "viewBox",
            `-${arrowStrokeWidth} -${arrowStrokeWidth} ${
                2 * arrowStrokeWidth + arrowWidth
            } ${2 * arrowStrokeWidth + arrowHeight}`
        );
        svg.setAttribute("width", `${arrowWidth}`);
        svg.setAttribute("height", `${arrowHeight}`);
        svg.style.filter = "drop-shadow(0px 0px 1px rgba(0, 0, 0, .7))";

        const borderPath = document.createElementNS(
            BuiltInLiveCursor.svgNamespace,
            "path"
        );
        borderPath.setAttribute("d", this._arrowPathData ?? "");
        borderPath.setAttribute("stroke", arrowBorderColor);
        borderPath.setAttribute("stroke-width", String(arrowStrokeWidth));
        borderPath.setAttribute("stroke-linejoin", "round");
        borderPath.setAttribute("stroke-opacity", "0.90");

        const fillPath = document.createElementNS(
            BuiltInLiveCursor.svgNamespace,
            "path"
        );
        fillPath.setAttribute("d", this._arrowPathData ?? "");
        fillPath.setAttribute("fill", backgroundColor);
        fillPath.setAttribute("stroke", backgroundColor);
        fillPath.setAttribute("stroke-width", "2");
        fillPath.setAttribute("stroke-linejoin", "round");

        svg.appendChild(borderPath);
        svg.appendChild(fillPath);

        return svg;
    }

    private createPictureElement(
        arrowHeight: number,
        arrowWidth: number
    ): HTMLImageElement {
        const image = document.createElement("img");

        image.setAttribute("src", this.userInfo?.pictureUri ?? "");
        image.setAttribute("alt", "");
        image.setAttribute("aria-hidden", "true");
        image.style.width = `${arrowHeight * 1.1}px`;
        image.style.height = `${arrowHeight * 1.1}px`;
        image.style.borderRadius = "50%";
        image.style.margin = `${arrowHeight * 0.75}px 0 0 -${
            arrowWidth * 0.25
        }px`;

        return image;
    }

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

        const element = document.createElement("div");
        element.style.position = "absolute";
        element.style.display = "flex";
        element.style.flexDirection = "row";

        element.appendChild(
            this.createArrowElement(
                arrowStrokeWidth,
                arrowWidth,
                arrowHeight,
                arrowBorderColor,
                backgroundColor
            )
        );

        if (this.userInfo) {
            if (this.userInfo.displayName && !this.userInfo.pictureUri) {
                const nameElement = document.createElement("div");
                nameElement.style.display = "flex";
                nameElement.style.alignItems = "center";
                nameElement.style.boxShadow = "0 0 2px black";
                nameElement.style.backgroundColor = backgroundColor;
                nameElement.style.height = `${arrowHeight}px`;
                nameElement.style.color = textColor;
                nameElement.style.borderRadius = `${arrowHeight / 2}px / 50%`;
                nameElement.style.borderTopLeftRadius = "4px";
                nameElement.style.padding = "2px 8px";
                nameElement.style.margin = `${arrowHeight * 0.75}px 0 0 -${
                    arrowWidth * 0.25
                }px`;
                nameElement.style.whiteSpace = "nowrap";
                nameElement.style.fontSize = "12px";
                nameElement.style.fontFamily = "sans-serif";
                nameElement.textContent = this.userInfo.displayName;

                element.appendChild(nameElement);
            } else if (this.userInfo.pictureUri && !this.userInfo.displayName) {
                const imageElement = this.createPictureElement(
                    arrowHeight,
                    arrowWidth
                );
                imageElement.style.boxShadow = "0 0 2px black";

                element.appendChild(imageElement);
            } else if (this.userInfo.pictureUri && this.userInfo.displayName) {
                const container = document.createElement("div");
                container.style.display = "flex";
                container.style.flexDirection = "row";
                container.style.alignItems = "center";
                container.style.backgroundColor = backgroundColor;
                container.style.color = textColor;
                container.style.borderRadius = `${arrowHeight / 2}px / 50%`;
                container.style.margin = `${arrowHeight * 0.75}px 0 0 -${
                    arrowWidth * 0.25
                }px`;
                container.style.padding = "2px";
                container.style.whiteSpace = "nowrap";
                container.style.fontSize = "12px";
                container.style.fontFamily = "sans-serif";
                container.style.boxShadow = "0 0 2px black";

                const imageElement = this.createPictureElement(
                    arrowHeight,
                    arrowWidth
                );
                imageElement.style.margin = "0";

                const nameElement = document.createElement("div");
                nameElement.style.padding = "0 8px";
                nameElement.textContent = this.userInfo.displayName;

                container.appendChild(imageElement);
                container.appendChild(nameElement);
                element.appendChild(container);
            }
        }

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
