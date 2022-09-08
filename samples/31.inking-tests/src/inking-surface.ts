/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITeamsFluidClientOptions, TeamsFluidClient } from "@microsoft/live-share";
import { InkingManager, InputFilter, SharedInkingSession } from "@microsoft/live-share-inking";
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

        this._inkingManager = new InkingManager(this._hostElement);
        this._inkingManager.setInputFilters(this._inputFilters);

        await inkingSession.initialize(this._inkingManager);

        this._inkingManager.activate();
    }

    constructor(hostElement: HTMLElement, private _inputFilters?: InputFilter[]) {
        this._hostElement = hostElement;
    }

    getSharedInkingSession(): SharedInkingSession {
        return this._container.initialObjects.inkingSession as SharedInkingSession;
    }

    async start() {
        try {
            await this.internalStart();
        }
        catch (error) {
            console.error(error)

            document.body.innerText = `Error: ${JSON.stringify(error)}`;
        };
    }

    getContext(): CanvasRenderingContext2D {
        return (this.inkingManager as any)._dryCanvas._context;
    }

    reRender() {
        (this.inkingManager as any).reRender();
    }

    get inkingManager(): InkingManager {
        return this._inkingManager;
    }
}