/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITeamsFluidClientOptions, TeamsFluidClient } from "@microsoft/live-share";
import { InkingManager, SharedInkingSession } from "@microsoft/live-share-inking";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { IFluidContainer } from "fluid-framework";

const containerSchema = {
    initialObjects: {
        inkingSession: SharedInkingSession
    }
};

export class InkingSurface {
    private _hostElement: HTMLElement;
    private _inkingManager!: InkingManager;
    private _container!: IFluidContainer;

    private getSharedInkingSession(): SharedInkingSession {
        return this._container.initialObjects.inkingSession as SharedInkingSession;
    }

    private async internalStart() {
        const clientOptions: ITeamsFluidClientOptions = {
            connection: {
                type: "local",
                tokenProvider: new InsecureTokenProvider("", { id: "123" }),
                endpoint: "http://localhost:7070"
            }
        };

        const client = new TeamsFluidClient(clientOptions);

        this._container = (await client.joinContainer(containerSchema)).container;

        const inkingSession = this.getSharedInkingSession();

        this._inkingManager = inkingSession.synchronize(this._hostElement);
        this._inkingManager.setInputFilters([]);
        this._inkingManager.activate();
    }

    constructor(hostElement: HTMLElement) {
        this._hostElement = hostElement;
    }

    start() {
        this.internalStart().catch(
            (error) => {
                console.error(error)

                document.body.innerText = `Error: ${JSON.stringify(error)}`;
            });
    }

    get inkingManager(): InkingManager {
        return this._inkingManager;
    }
}