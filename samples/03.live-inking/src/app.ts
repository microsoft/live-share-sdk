/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as microsoftTeams from "@microsoft/teams-js";
import { TeamsFluidClient, UserMeetingRole } from "@microsoft/live-share";
import { LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { SharedInkingSession, InkingManager, InkingTool } from "@microsoft/live-share-inking";

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
        inkingSession: SharedInkingSession
    }
};

var inkingManager: InkingManager;

async function start() {
    const client = new TeamsFluidClient({
        connection: {
            tenantId: LOCAL_MODE_TENANT_ID,
            tokenProvider: new InsecureTokenProvider("", { id: "123" }),
            orderer: "http://localhost:7070",
            storage: "http://localhost:7070",
        }
    });

    const { container } = await client.joinContainer(containerSchema);

    const inkingHost = document.getElementById("inkingHost");

    if (inkingHost) {
        const inkingSession = container.initialObjects.inkingSession as SharedInkingSession;

        inkingManager = inkingSession.synchronize(inkingHost);
        inkingManager.activate();

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

    setupButton("btnClear", () => { inkingManager.clear() });

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

