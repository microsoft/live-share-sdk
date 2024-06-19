/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ContainerSchema, IFluidContainer } from "fluid-framework";
import {
    AzureClient,
    AzureClientProps,
    AzureContainerServices,
} from "@fluidframework/azure-client";
import { BaseLiveShareClient } from "./BaseLiveShareClient";
import { ILiveShareHost } from "./interfaces";
import { AzureLiveShareHost } from "./AzureLiveShareHost";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { getLiveContainerSchema } from "./schema-injection-utils";
import {
    getContainerEntryPoint,
    getContainerRuntime,
    getRootDirectory,
} from "./internals/smuggle";
import { SharedMap } from "fluid-framework/legacy";
import { DynamicObjectManager } from "./DynamicObjectManager";

/**
 * The `AzureLiveShareClient` implementation `BaseLiveShareClient`.
 * @see BaseLiveShareClient
 */
export class AzureLiveShareClient extends BaseLiveShareClient {
    private _host: ILiveShareHost;
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
     * @param host Optional. ILiveShareHost implementation to use when using Live Share DDS's.
     */
    constructor(
        props: AzureClientProps,
        host: ILiveShareHost = AzureLiveShareHost.create(true)
    ) {
        super(new LiveShareRuntime(host));
        this._client = new AzureClient(props);
        this._host = host;
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
    public async createContainer(
        fluidContainerSchema?: ContainerSchema
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const schema = this.getInjectedContainerSchema(fluidContainerSchema);
        this._results = await this._client.createContainer(schema);
        if (this._host instanceof AzureLiveShareHost) {
            this._host.setAudience(this._results.services.audience);
        }

        const rootDataObject = getContainerEntryPoint(this._results.container);
        const rootDirectory = getRootDirectory(rootDataObject);
        const containerRuntime = getContainerRuntime(rootDataObject);

        const turboDir = rootDirectory.createSubDirectory("turbo-directory");
        const obj = await SharedMap.create(containerRuntime, undefined);
        turboDir.set("TURBO_STATE_MAP", obj.handle);

        const turboObjectManager = await this._results.container.create(
            DynamicObjectManager
        );
        turboDir.set("TURBO_DYNAMIC_OBJECTS", turboObjectManager.handle);

        await this._runtime.start();
        return this._results;
    }

    /**
     * Accesses the existing container given its unique ID in the Azure Fluid Relay.
     * @param id - Unique ID of the container in Azure Fluid Relay.
     * @param initialObjects Optional. Fluid ContainerSchema initialObjects.
     * @param host Optional. ILiveShareHost implementation to use when using Live Share DDS's.
     * @returns Existing container instance along with associated services.
     */
    public async getContainer(
        id: string,
        fluidContainerSchema?: ContainerSchema
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const schema = this.getInjectedContainerSchema(fluidContainerSchema);
        this._results = await this._client.getContainer(id, schema);
        if (this._host instanceof AzureLiveShareHost) {
            this._host.setAudience(this._results.services.audience);
        }
        await this._runtime.start();
        return this._results;
    }

    private getInjectedContainerSchema(
        fluidContainerSchema?: ContainerSchema
    ): ContainerSchema {
        return getLiveContainerSchema(
            this.getContainerSchema(fluidContainerSchema),
            this._runtime
        );
    }
}
