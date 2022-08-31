import * as Utils from "./utils";
import { View } from "./view";
import { app, pages } from "@microsoft/teams-js";

export class ConfigView extends View {
    private onSavePagesConfig = async (saveEvent: pages.config.SaveEvent) => {
        const host = "https://" + window.location.host;

        // const context = await app.getContext();

        await pages.config.setConfig(
            {
                contentUrl: window.location.origin + '?inTeams=1',
                websiteUrl: window.location.origin,
                suggestedDisplayName: "Inking With Live Share"
                // entityId: context.page.id
            });
            
        saveEvent.notifySuccess();    
    };

    constructor() {
        super();

        const template = `<div>This is the config page.</div>`;

        Utils.loadTemplate(template, document.body);
    }

    start() {
        app.initialize();
        pages.config.registerOnSaveHandler(this.onSavePagesConfig);
        pages.config.setValidityState(true);
        app.notifySuccess();
    }
}