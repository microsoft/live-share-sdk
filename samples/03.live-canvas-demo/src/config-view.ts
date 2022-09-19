/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import * as Utils from "./utils";
import { View } from "./view";
import { app, pages } from "@microsoft/teams-js";

export class ConfigView extends View {
    private onSavePagesConfig = async (saveEvent: pages.config.SaveEvent) => {
        const host = "https://" + window.location.host;

        await pages.config.setConfig(
            {
                contentUrl: window.location.origin + '?inTeams=1&view=sideBar',
                websiteUrl: window.location.origin,
                suggestedDisplayName: "Live Share Canvas demo"
            });

        saveEvent.notifySuccess();
    };

    constructor() {
        super();

        const template = `<div>Welcome to the Live Share Canvas demo. Click the button below to start collaborative inking.</div>`;

        Utils.loadTemplate(template, document.body);
    }

    async start() {
        if (Utils.runningInTeams()) {
            await app.initialize();
            pages.config.registerOnSaveHandler(this.onSavePagesConfig);
            pages.config.setValidityState(true);
            app.notifySuccess();
        }
    }
}