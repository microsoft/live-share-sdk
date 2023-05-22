/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    LivePresence,
    LiveShareClient,
    LiveState,
    TestLiveShareHost,
} from "@microsoft/live-share";
import { app, LiveShareHost } from "@microsoft/teams-js";
import { renderMeetingStage } from "./renderMeetingStage";
import { renderMeetingSidePanel } from "./renderMeetingSidePanel";
import { renderTabConfig } from "./renderTabConfig";
import { renderError } from "./renderError";
import { SharedMap } from "fluid-framework";

const searchParams = new URL(window.location.href).searchParams;
const IN_TEAMS = searchParams.get("inTeams") === "1";
const root = document.getElementById("content");
let theme = "light";

// Define container schema
const containerSchema = {
    initialObjects: {
        diceState: LiveState, // shared dice value, resets once all users close app
        presence: LivePresence, // each user has their own dice value, resets once all users close app
        storedDiceMap: SharedMap, // stored dice value that will last 6 hours from session creation
    },
};

// STARTUP LOGIC

async function start() {
    // Check for page to display
    let view = searchParams.get("view") || "stage";

    // Check if we are running on stage.
    if (IN_TEAMS) {
        // Initialize teams app
        await app.initialize();
        // Get Teams app context to get the initial theme
        const context = await app.getContext();
        theme = context.app.theme === "default" ? "light" : "dark";
        app.registerOnThemeChangeHandler((theme) => {
            theme = theme === "default" ? "light" : "dark";
        });
    }

    // Load the requested view
    switch (view) {
        case "content": {
            const { container } = await joinContainer();
            await renderMeetingSidePanel(container, root, theme);
            break;
        }
        case "config": {
            renderTabConfig(root, theme);
            break;
        }
        case "stage":
        default: {
            const { container } = await joinContainer();
            await renderMeetingStage(container, root, theme);
            break;
        }
    }
}

async function joinContainer() {
    // Are we running in teams?
    const host = IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create();

    // Create client
    const client = new LiveShareClient(host);

    // Join container
    return await client.joinContainer(containerSchema);
}

start().catch((error) => renderError(root, error, theme));
