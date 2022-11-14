/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import * as Utils from "./utils";
import { View } from "./view";
import { app, meeting } from "@microsoft/teams-js";

export class SidebarView extends View {
    constructor() {
        super();

        let template = `<div>Welcome to the Live Share Canvas demo</div>`;

        if (Utils.runningInTeams()) {
            template += `<button id="btnShareToStage">Share to Stage</button>`;
        }

        Utils.loadTemplate(template, document.body);

        const shareToStageButton = document.getElementById("btnShareToStage");

        if (shareToStageButton) {
            shareToStageButton.onclick = () => {
                meeting.shareAppContentToStage((error, result) => {
                    if (!error) {
                        console.log("Started sharing to stage");
                    } else {
                        console.warn("shareAppContentToStage failed", error);
                    }
                }, window.location.origin + "?inTeams=1&view=stage");
            };
        }
    }

    start() {
        app.initialize();
        app.notifySuccess();
    }
}
