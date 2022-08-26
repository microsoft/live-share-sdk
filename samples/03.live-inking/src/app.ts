/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as microsoftTeams from "@microsoft/teams-js";
import { EphemeralEvent, TeamsFluidClient, UserMeetingRole } from "@microsoft/live-share";
import { LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { SharedInkingSession, InkingManager, InkingTool } from "@microsoft/live-share-inking";
import { IFluidContainer } from "fluid-framework";
import { DrawingSimulation } from "./simulation";

function runningInTeams(): boolean {
    const currentUrl = window.location.href;

    // Check if using HistoryRouter
    const url = currentUrl.includes("/#/")
        ? new URL(`${window.location.href.split("/#/").join("/")}`)
        : new URL(window.location.href);

    return url.searchParams.get("inTeams") !== null;
}

const containerSchema = {
    initialObjects: {
        inkingSession: SharedInkingSession,
        startStopDrawingSimulation: EphemeralEvent
    }
};

var inkingManager: InkingManager;
var container: IFluidContainer;
var simulation: DrawingSimulation;
var simulationStarted = false;

function getSharedInkingSession(): SharedInkingSession {
    return container.initialObjects.inkingSession as SharedInkingSession;
}

function startOrStopDrawingSimulation(start: boolean) {
    (container.initialObjects.startStopDrawingSimulation as EphemeralEvent).sendEvent({ isStarted: start });
}

async function start() {
    const client = new TeamsFluidClient({
        connection: {
            tenantId: LOCAL_MODE_TENANT_ID,
            tokenProvider: new InsecureTokenProvider("", { id: "123" }),
            orderer: "http://localhost:7070",
            storage: "http://localhost:7070",
        }
    });

    container = (await client.joinContainer(containerSchema)).container;

    const startStopDrawingSimulationEvent = container.initialObjects.startStopDrawingSimulation as EphemeralEvent;
    startStopDrawingSimulationEvent.on(
        "received",
        (event, local) => {
            const button = document.getElementById("btnSimulation");

            if (local) {
                simulationStarted = event.isStarted;

                if (button) {
                    button.innerText = simulationStarted ? "Stop simulation" : "Start simulation";
                }
            }
            else {
                if (event.isStarted) {
                    // Ait a maximum of 1 second so not all clients starts drawing at the same time
                    window.setTimeout(
                        () => { simulation.start(); },
                        Math.random() * 5000);
                }
                else {
                    simulation.stop();
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
        const inkingSession = getSharedInkingSession();
        inkingSession.onGetCursorInfo = (clientId: string) => {
            // Map clientId to a name and picture URI
            return {
                clientId,
                name: "Mark Knopfler",
                pictureUri: "https://assets.mubi.com/images/cast_member/52480/image-original.jpg?1416636889"
            }
        }

        inkingManager = inkingSession.synchronize(inkingHost);
        inkingManager.activate();

        simulation = new DrawingSimulation(inkingManager);

        /*
        // Set which roles can draw on the canvas. By default, all roles are allowed
        inkingSession.allowedRoles = [ UserMeetingRole.presenter ];
        */
    }
}

function offsetBy(x: number, y: number) {
    inkingManager.offset = {
        x: inkingManager.offset.x + x,
        y: inkingManager.offset.y + y
    }
}

window.onload = async () => {
    const setupButton = (buttonId: string, onClick: () => void) => {
        const button = document.getElementById(buttonId);

        if (button) {
            button.onclick = onClick;
        }
    }

    setupButton("btnStroke", () => { inkingManager.tool = InkingTool.Pen });
    setupButton("btnLaserPointer", () => { inkingManager.tool = InkingTool.LaserPointer });
    setupButton("btnHighlighter", () => { inkingManager.tool = InkingTool.Highlighter });
    setupButton("btnEraser", () => { inkingManager.tool = InkingTool.Eraser });
    setupButton("btnPointEraser", () => { inkingManager.tool = InkingTool.PointEraser });

    setupButton("btnYellow", () => { inkingManager.penBrush.color = { r: 255, g: 252, b: 0 } });
    setupButton("btnGreen", () => { inkingManager.penBrush.color = { r: 0, g: 255, b: 0 } });
    setupButton("btnRed", () => { inkingManager.penBrush.color = { r: 255, g: 0, b: 0 } });
    setupButton("btnBlue", () => { inkingManager.penBrush.color = { r: 0, g: 105, b: 175 } });

    setupButton("btnClear", () => { inkingManager.clear(); });

    setupButton("btnOffsetLeft", () => { offsetBy(-10, 0); });
    setupButton("btnOffsetUp", () => { offsetBy(0, -10); });
    setupButton("btnOffsetRight", () => { offsetBy(10, 0); });
    setupButton("btnOffsetDown", () => { offsetBy(0, 10); });

    setupButton("btnZoomOut", () => {
        if (inkingManager.scale > 0.1) {
            inkingManager.scale -= 0.1;
        }
    });
    setupButton("btnZoomIn", () => { inkingManager.scale += 0.1; });

    setupButton(
        "btnToggleCursorShare",
        () => {
            const sharedInkingSession = getSharedInkingSession();
            const isCursorShared = sharedInkingSession.isCursorShared;

            sharedInkingSession.isCursorShared = !isCursorShared;

            const button = document.getElementById("btnToggleCursorShare");

            if (button) {
                button.innerText = sharedInkingSession.isCursorShared ? "Stop sharing cursor" : "Share cursor";
            }
        }
    )

    setupButton("btnSimulation", () => { startOrStopDrawingSimulation(!simulationStarted); });

    var offset = 0;

    setupButton("btnOpenNewWindow",
        () => {
            window.open(document.URL, "_blank", `left=${offset},top=${offset},width=1000,height=1000`);

            offset += 80;
        });

    if (runningInTeams()) {
        try {
            console.log("Initializing the Teams Client SDK...");

            await microsoftTeams.app.initialize();
            
            microsoftTeams.app.notifyAppLoaded();
            microsoftTeams.app.notifySuccess();
        }
        catch (error) {
            console.error(error);
        }
    }
    else {
        console.log("Running the demo outside of Teams.");
    }

    start().catch((error) => console.error(error));
}

