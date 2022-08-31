import * as Utils from "./utils";
import { View } from "./view";
import { EphemeralEvent, TeamsFluidClient } from "@microsoft/live-share";
import { InkingManager, InkingTool, SharedInkingSession } from "@microsoft/live-share-inking";
import { IFluidContainer } from "fluid-framework";
import { DrawingSimulation } from "./simulation";
import { LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { app } from "@microsoft/teams-js";

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
            <div class="toolbar">
                <button id="btnSimulation">Start simulation</button>
                <button id="btnOpenNewWindow">Open new window</button>
            </div>
        </div>
    </div>`;

const containerSchema = {
    initialObjects: {
        inkingSession: SharedInkingSession,
        startStopDrawingSimulation: EphemeralEvent
    }
};

export class MainView extends View {
    private _inkingManager!: InkingManager;
    private _container!: IFluidContainer;
    private _drawingSimulation!: DrawingSimulation;
    private _simulationStarted = false;

    private offsetBy(x: number, y: number) {
        this._inkingManager.offset = {
            x: this._inkingManager.offset.x + x,
            y: this._inkingManager.offset.y + y
        }

        this.updateBackgroundImagePosition();
    }

    private getSharedInkingSession(): SharedInkingSession {
        return this._container.initialObjects.inkingSession as SharedInkingSession;
    }
    
    private startOrStopDrawingSimulation(start: boolean) {
        (this._container.initialObjects.startStopDrawingSimulation as EphemeralEvent).sendEvent({ isStarted: start });
    }

    private runningInTeams(): boolean {
        const params = new URLSearchParams(window.location.search);
        const config = params.get("inTeams");
    
        return config !== null && config.toLowerCase() === "1";
    }

    private _hostResizeObserver!: ResizeObserver;

    private async internalStart() {
        const clientOptions = this.runningInTeams()
            ? undefined
            : {
                connection: {
                    tenantId: LOCAL_MODE_TENANT_ID,
                    tokenProvider: new InsecureTokenProvider("", { id: "123" }),
                    orderer: "http://localhost:7070",
                    storage: "http://localhost:7070",
                }
            };

        const client = new TeamsFluidClient(clientOptions);
    
        this._container = (await client.joinContainer(containerSchema)).container;
    
        const startStopDrawingSimulationEvent = this._container.initialObjects.startStopDrawingSimulation as EphemeralEvent;
        startStopDrawingSimulationEvent.on(
            "received",
            (event, local) => {
                const button = document.getElementById("btnSimulation");
    
                if (local) {
                    this._simulationStarted = event.isStarted;
    
                    if (button) {
                        button.innerText = this._simulationStarted ? "Stop simulation" : "Start simulation";
                    }
                }
                else {
                    if (event.isStarted) {
                        // Ait a maximum of 1 second so not all clients starts drawing at the same time
                        window.setTimeout(
                            () => { this._drawingSimulation.start(); },
                            Math.random() * 5000);
                    }
                    else {
                        this._drawingSimulation.stop();
                    }
    
                    if (button) {
                        if (event.isStarted) {
                            button.setAttribute("disabled", "");
                        }
                        else {
                            button.removeAttribute("disabled");
                        }
                    }    
                }
            }
        );
    
        startStopDrawingSimulationEvent.start();
    
        const inkingHost = document.getElementById("inkingHost");
    
        if (inkingHost) {
            const inkingSession = this.getSharedInkingSession();
            inkingSession.onGetCursorInfo = (clientId: string) => {
                // Map clientId to a name and picture URI
                return {
                    clientId,
                    name: "Mark Knopfler",
                    pictureUri: "https://assets.mubi.com/images/cast_member/52480/image-original.jpg?1416636889"
                }
            }
    
            this._inkingManager = inkingSession.synchronize(inkingHost);
            this._inkingManager.activate();
    
            this._drawingSimulation = new DrawingSimulation(this._inkingManager);
    
            this._hostResizeObserver = new ResizeObserver(() => { this.updateBackgroundImagePosition(); });
            this._hostResizeObserver.observe(inkingHost);

            /*
            // Set which roles can draw on the canvas. By default, all roles are allowed
            inkingSession.allowedRoles = [ UserMeetingRole.presenter ];
            */
        }

        this.updateBackgroundImagePosition();
    }

    private _backgroundImageWidth?: number;
    private _backgroundImageHeight?: number;

    private updateBackgroundImagePosition() {
        const backgroundImage = document.getElementById("backgroundImage");

        if (backgroundImage && this._inkingManager && this._backgroundImageWidth && this._backgroundImageHeight) {
            backgroundImage.style.removeProperty("visibility");

            const actualWidth = this._backgroundImageWidth * this._inkingManager.scale;
            const actualHeight = this._backgroundImageHeight * this._inkingManager.scale;

            backgroundImage.style.width = actualWidth + "px";
            backgroundImage.style.height = actualHeight + "px";
            backgroundImage.style.left = (this._inkingManager.centerX + this._inkingManager.offset.x - this._backgroundImageWidth / 2 * this._inkingManager.scale) + "px";
            backgroundImage.style.top = (this._inkingManager.centerY + this._inkingManager.offset.y - this._backgroundImageHeight / 2 * this._inkingManager.scale) + "px";
        }
    }

    constructor() {
        super();

        Utils.loadTemplate(appTemplate, document.body);

        const backgroundImage = document.getElementById("backgroundImage") as HTMLImageElement;

        if (backgroundImage) {
            const showBackgroundImage = () => {
                this._backgroundImageWidth = backgroundImage.naturalWidth;
                this._backgroundImageHeight = backgroundImage.naturalHeight;

                this.updateBackgroundImagePosition();
            }

            if (backgroundImage.complete) {
                showBackgroundImage();
            }
            else {
                backgroundImage.addEventListener(
                    "load",
                    () => {
                        showBackgroundImage();
                    });
            }
        }

        const setupButton = (buttonId: string, onClick: () => void) => {
            const button = document.getElementById(buttonId);
    
            if (button) {
                button.onclick = onClick;
            }
        }
    
        setupButton("btnStroke", () => { this._inkingManager.tool = InkingTool.Pen });
        setupButton("btnLaserPointer", () => { this._inkingManager.tool = InkingTool.LaserPointer });
        setupButton("btnHighlighter", () => { this._inkingManager.tool = InkingTool.Highlighter });
        setupButton("btnEraser", () => { this._inkingManager.tool = InkingTool.Eraser });
        setupButton("btnPointEraser", () => { this._inkingManager.tool = InkingTool.PointEraser });
    
        setupButton("btnBlack", () => { this._inkingManager.penBrush.color = { r: 0, g: 0, b: 0 } });
        setupButton("btnYellow", () => { this._inkingManager.penBrush.color = { r: 255, g: 252, b: 0 } });
        setupButton("btnGreen", () => { this._inkingManager.penBrush.color = { r: 0, g: 255, b: 0 } });
        setupButton("btnRed", () => { this._inkingManager.penBrush.color = { r: 255, g: 0, b: 0 } });
        setupButton("btnBlue", () => { this._inkingManager.penBrush.color = { r: 0, g: 105, b: 175 } });
    
        setupButton("btnClear", () => { this._inkingManager.clear(); });
    
        setupButton("btnOffsetLeft", () => { this.offsetBy(-10, 0); });
        setupButton("btnOffsetUp", () => { this.offsetBy(0, -10); });
        setupButton("btnOffsetRight", () => { this.offsetBy(10, 0); });
        setupButton("btnOffsetDown", () => { this.offsetBy(0, 10); });
    
        setupButton(
            "btnResetView",
            () => {
                this._inkingManager.offset = {
                    x: 0,
                    y: 0
                }

                this._inkingManager.scale = 1;

                this.updateBackgroundImagePosition();
            }
        );

        setupButton(
            "btnZoomOut",
            () => {
                if (this._inkingManager.scale > 0.1) {
                    this._inkingManager.scale -= 0.1;

                    this.updateBackgroundImagePosition();
                }
            }
        );
        setupButton(
            "btnZoomIn",
            () => {
                this._inkingManager.scale += 0.1;

                this.updateBackgroundImagePosition();
            }
        );
    
        setupButton(
            "btnToggleCursorShare",
            () => {
                const sharedInkingSession = this.getSharedInkingSession();
                const isCursorShared = sharedInkingSession.isCursorShared;
    
                sharedInkingSession.isCursorShared = !isCursorShared;
    
                const button = document.getElementById("btnToggleCursorShare");
    
                if (button) {
                    button.innerText = sharedInkingSession.isCursorShared ? "Stop sharing cursor" : "Share cursor";
                }
            }
        );

        if (this.runningInTeams()) {
            Utils.toggleElementVisibility("btnSimulation", false);
            Utils.toggleElementVisibility("btnOpenNewWindow", false);
        }
        else {
            setupButton("btnSimulation", () => { this.startOrStopDrawingSimulation(!this._simulationStarted); });
        
            var offset = 0;
        
            setupButton(
                "btnOpenNewWindow",
                () => {
                    window.open(document.URL, "_blank", `left=${offset},top=${offset},width=1000,height=1000`);
        
                    offset += 80;
                });
            }
    }

    start() {
        if (this.runningInTeams()) {
            app.initialize();
            app.notifySuccess();
        }

        this.internalStart().catch(
            (error) => {
                console.error(error)

                Utils.loadTemplate(`<div>Error: ${JSON.stringify(error)}</div>`, document.body);
            });
    }
}