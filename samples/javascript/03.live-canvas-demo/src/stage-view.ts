/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import * as Teams from "@microsoft/teams-js";
import {
    ILiveShareClientOptions,
    LiveShareClient,
} from "@microsoft/live-share";
import {
    InkingManager,
    InkingTool,
    IUserInfo,
    LiveCanvas,
} from "@microsoft/live-share-canvas";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { IFluidContainer } from "fluid-framework";
import * as Utils from "./utils";
import { View } from "./view";
import { getRandomUserInfo } from "./random-userInfo";

/**
 * Other images
 * https://guitar.com/wp-content/uploads/2020/09/Mark-Knopfler-Dire-Straits-Credit-Mick-Hutson-Redferns@2160x1459.jpg
 * https://guitar.com/wp-content/uploads/2020/09/Mark-Knopfler-Dier-Straits-Suhr-Schecter-Credit-Ebet-Roberts-Redferns@2560x1707.jpg
 */

const appTemplate = `
    <div id="appRoot">
        <div id="inkingRoot">
            <img id="backgroundImage" src="https://guitar.com/wp-content/uploads/2020/09/Mark-Knopfler-Dire-Straits-Credit-Mick-Hutson-Redferns@2160x1459.jpg"
                 alt="Mark Knopfler playing guitar" style="visibility: hidden;">
            <div id="inkingHost"></div>
        </div>
        <div id="buttonStrip">
            <div class="toolbar">
                <button id="btnStroke">Stroke</button>
                <button id="btnArrow">Arrow</button>
                <button id="btnLaserPointer">Laser pointer</button>
                <button id="btnHighlighter">Highlighter</button>
                <button id="btnEraser">Eraser</button>
                <button id="btnPointEraser">Point eraser</button>
                <button id="btnClear" style="margin-left: 20px;">Clear</button>
                <button id="btnToggleCursorShare">Share cursor</button>
            </div>
            <div class="toolbar">
                <button id="btnBlack">Black</button>
                <button id="btnRed">Red</button>
                <button id="btnGreen">Green</button>
                <button id="btnBlue">Blue</button>
                <button id="btnYellow">Yellow</button>
            </div>
            <div class="toolbar">
                <button id="btnZoomOut">Zoom out</button>
                <button id="btnZoomIn">Zoom in</button>
                <button id="btnOffsetLeft" style="margin-left: 20px;">Offset left</button>
                <button id="btnOffsetUp">Offset up</button>
                <button id="btnOffsetRight">Offset right</button>
                <button id="btnOffsetDown">Offset down</button>
                <button id="btnResetView" style="margin-left: 20px;">Reset view</button>
            </div>
        </div>
    </div>`;

const containerSchema = {
    initialObjects: {
        liveCanvas: LiveCanvas,
    },
};

export class StageView extends View {
    private _inkingManager!: InkingManager;
    private _container!: IFluidContainer;

    private offsetBy(x: number, y: number) {
        this._inkingManager.offset = {
            x: this._inkingManager.offset.x + x,
            y: this._inkingManager.offset.y + y,
        };

        this.updateBackgroundImagePosition();
    }

    private getLiveCanvas(): LiveCanvas {
        return this._container.initialObjects.liveCanvas as LiveCanvas;
    }

    private _hostResizeObserver!: ResizeObserver;
    private _userInfo: IUserInfo;

    private async internalStart() {
        let client: LiveShareClient;
        if (Utils.runningInTeams()) {
            client = new LiveShareClient(new Teams.LiveShareHost());
        } else {
            client = new LiveShareClient(new TestLiveShareHost());
        }

        this._container = (
            await client.joinContainer(containerSchema)
        ).container;

        const inkingHost = document.getElementById("inkingHost");

        if (inkingHost) {
            const liveCanvas = this.getLiveCanvas();
            liveCanvas.onGetLocalUserInfo = () => {
                return this._userInfo;
            };

            this._inkingManager = new InkingManager(inkingHost);

            await liveCanvas.initialize(this._inkingManager);

            this._inkingManager.activate();

            this._hostResizeObserver = new ResizeObserver(() => {
                this.updateBackgroundImagePosition();
            });
            this._hostResizeObserver.observe(inkingHost);

            /*
            // Set which roles can draw on the canvas. By default, all roles are allowed
            liveCanvas.allowedRoles = [ UserMeetingRole.presenter ];
            */
        }

        this.updateBackgroundImagePosition();
    }

    private _backgroundImageWidth?: number;
    private _backgroundImageHeight?: number;

    private updateBackgroundImagePosition() {
        const backgroundImage = document.getElementById("backgroundImage");

        if (
            backgroundImage &&
            this._inkingManager &&
            this._backgroundImageWidth &&
            this._backgroundImageHeight
        ) {
            backgroundImage.style.removeProperty("visibility");

            const actualWidth =
                this._backgroundImageWidth * this._inkingManager.scale;
            const actualHeight =
                this._backgroundImageHeight * this._inkingManager.scale;

            backgroundImage.style.width = actualWidth + "px";
            backgroundImage.style.height = actualHeight + "px";
            backgroundImage.style.left =
                this._inkingManager.centerX +
                this._inkingManager.offset.x -
                (this._backgroundImageWidth / 2) * this._inkingManager.scale +
                "px";
            backgroundImage.style.top =
                this._inkingManager.centerY +
                this._inkingManager.offset.y -
                (this._backgroundImageHeight / 2) * this._inkingManager.scale +
                "px";
        }
    }

    constructor() {
        super();

        this._userInfo = getRandomUserInfo();

        Utils.loadTemplate(appTemplate, document.body);

        const backgroundImage = document.getElementById(
            "backgroundImage"
        ) as HTMLImageElement;

        if (backgroundImage) {
            const showBackgroundImage = () => {
                this._backgroundImageWidth = backgroundImage.naturalWidth;
                this._backgroundImageHeight = backgroundImage.naturalHeight;

                this.updateBackgroundImagePosition();
            };

            if (backgroundImage.complete) {
                showBackgroundImage();
            } else {
                backgroundImage.addEventListener("load", () => {
                    showBackgroundImage();
                });
            }
        }

        const setupButton = (buttonId: string, onClick: () => void) => {
            const button = document.getElementById(buttonId);

            if (button) {
                button.onclick = onClick;
            }
        };

        setupButton("btnStroke", () => {
            this._inkingManager.tool = InkingTool.pen;
        });
        setupButton("btnArrow", () => {
            this._inkingManager.tool = InkingTool.line;
            this._inkingManager.lineBrush.endArrow = "open";
        });
        setupButton("btnLaserPointer", () => {
            this._inkingManager.tool = InkingTool.laserPointer;
        });
        setupButton("btnHighlighter", () => {
            this._inkingManager.tool = InkingTool.highlighter;
        });
        setupButton("btnEraser", () => {
            this._inkingManager.tool = InkingTool.eraser;
        });
        setupButton("btnPointEraser", () => {
            this._inkingManager.tool = InkingTool.pointEraser;
        });

        setupButton("btnBlack", () => {
            this._inkingManager.penBrush.color = { r: 0, g: 0, b: 0 };
        });
        setupButton("btnYellow", () => {
            this._inkingManager.penBrush.color = { r: 255, g: 252, b: 0 };
        });
        setupButton("btnGreen", () => {
            this._inkingManager.penBrush.color = { r: 0, g: 255, b: 0 };
        });
        setupButton("btnRed", () => {
            this._inkingManager.penBrush.color = { r: 255, g: 0, b: 0 };
        });
        setupButton("btnBlue", () => {
            this._inkingManager.penBrush.color = { r: 0, g: 105, b: 175 };
        });

        setupButton("btnClear", () => {
            this._inkingManager.clear();
        });

        setupButton("btnOffsetLeft", () => {
            this.offsetBy(-10, 0);
        });
        setupButton("btnOffsetUp", () => {
            this.offsetBy(0, -10);
        });
        setupButton("btnOffsetRight", () => {
            this.offsetBy(10, 0);
        });
        setupButton("btnOffsetDown", () => {
            this.offsetBy(0, 10);
        });

        setupButton("btnResetView", () => {
            this._inkingManager.offset = {
                x: 0,
                y: 0,
            };

            this._inkingManager.scale = 1;

            this.updateBackgroundImagePosition();
        });

        setupButton("btnZoomOut", () => {
            if (this._inkingManager.scale > 0.1) {
                this._inkingManager.scale -= 0.1;

                this.updateBackgroundImagePosition();
            }
        });
        setupButton("btnZoomIn", () => {
            this._inkingManager.scale += 0.1;

            this.updateBackgroundImagePosition();
        });

        setupButton("btnToggleCursorShare", () => {
            const liveCanvas = this.getLiveCanvas();
            const isCursorShared = liveCanvas.isCursorShared;

            liveCanvas.isCursorShared = !isCursorShared;

            const button = document.getElementById("btnToggleCursorShare");

            if (button) {
                button.innerText = liveCanvas.isCursorShared
                    ? "Stop sharing cursor"
                    : "Share cursor";
            }
        });
    }

    async start() {
        if (Utils.runningInTeams()) {
            await Teams.app.initialize();

            Teams.app.notifySuccess();
        }

        this.internalStart().catch((error) => {
            console.error(error);

            Utils.loadTemplate(
                `<div>Error: ${JSON.stringify(error)}</div>`,
                document.body
            );
        });
    }
}
