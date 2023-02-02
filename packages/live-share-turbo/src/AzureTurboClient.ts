/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IFluidContainer, LoadableObjectClassRecord } from "fluid-framework";
import {
    AzureClient,
    AzureClientProps,
    AzureContainerServices,
} from "@fluidframework/azure-client";
import { FluidTurboClient, getContainerSchema } from "./internals";

export class AzureTurboClient extends FluidTurboClient {
    private _client: AzureClient;
    private _results:
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
          }
        | undefined;

    /**
     * Creates a new client instance using configuration parameters.
     * @param props - Properties for initializing a new AzureClient instance
     */
    constructor(props: AzureClientProps) {
        super();
        this._client = new AzureClient(props);
    }

    /**
     * Get the Fluid join container results
     */
    public override get results():
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
          }
        | undefined {
        return this._results;
    }

    /**
     * Creates a new detached container instance in the Azure Fluid Relay.
     * @param initialObjects Optional. Fluid ContainerSchema initialObjects.
     * @returns New detached container instance along with associated services.
     */
    public async createContainer(initialObjects?: LoadableObjectClassRecord): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const schema = getContainerSchema(initialObjects);
        this._results = await this._client.createContainer(schema);
        // this.registerDynamicObjectListeners();
        return this._results;
    }

    /**
     * Accesses the existing container given its unique ID in the Azure Fluid Relay.
     * @param id - Unique ID of the container in Azure Fluid Relay.
     * @param initialObjects Optional. Fluid ContainerSchema initialObjects.
     * @returns Existing container instance along with associated services.
     */
    public async getContainer(
        id: string,
        initialObjects?: LoadableObjectClassRecord,
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const schema = getContainerSchema(initialObjects);
        this._results = await this._client.getContainer(id, schema);
        // this.registerDynamicObjectListeners();
        return this._results;
    }
}
