/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveShareClientOptions, LiveShareClient } from "@microsoft/live-share";
import { InkingManager, InputFilter, LiveCanvas } from "@microsoft/live-share-canvas";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { IFluidContainer } from "fluid-framework";

const containerSchema = {
    initialObjects: {
        liveCanvas: LiveCanvas
    }
};

export class InkingSurface {
    private _hostElement: HTMLElement;
    private _inkingManager!: InkingManager;
    private _container!: IFluidContainer;

    private async internalStart() {
        const clientOptions: ILiveShareClientOptions = {
            connection: {
                type: "local",
                tokenProvider: new InsecureTokenProvider("", { id: "123" }),
                endpoint: "http://localhost:7070"
            }
        };

        const client = new LiveShareClient(clientOptions);

        this._container = (await client.joinContainer(containerSchema)).container;

        const liveCanvas = this.getLiveCanvas();

        this._inkingManager = new InkingManager(this._hostElement);
        this._inkingManager.setInputFilters(this._inputFilters);

        await liveCanvas.initialize(this._inkingManager);

        this._inkingManager.activate();
    }

    constructor(hostElement: HTMLElement, private _inputFilters?: InputFilter[]) {
        this._hostElement = hostElement;
    }

    getLiveCanvas(): LiveCanvas {
        return this._container.initialObjects.liveCanvas as LiveCanvas;
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