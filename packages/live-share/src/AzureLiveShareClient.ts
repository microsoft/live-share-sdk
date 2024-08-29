/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ContainerSchema, IFluidContainer } from "fluid-framework";
import { AzureContainerServices } from "@fluidframework/azure-client/internal";
import { AzureClient, AzureClientProps } from "@fluidframework/azure-client";
import { BaseLiveShareClient } from "./internals/BaseLiveShareClient.js";
import { ILiveShareHost } from "./interfaces.js";
import { AzureLiveShareHost } from "./AzureLiveShareHost.js";
import { LiveShareRuntime } from "./internals/LiveShareRuntime.js";
import { getLiveContainerSchema } from "./internals/schema-injection-utils.js";
import { LiveShareClient } from "./LiveShareClient.js";
import { LiveDataObject } from "./internals/LiveDataObject.js";
import { FluidCompatibilityMode } from "./internals/consts.js";

/**
 * @alpha
 * The `AzureLiveShareClient` implementation `BaseLiveShareClient`.
 * @see BaseLiveShareClient
 *
 * @remarks
 * You may choose to use this instead of {@link LiveShareClient} if you are using a custom Azure Fluid Relay instance.
 * {@link LiveShareClient} does support custom Azure Fluid Relay connections, but only allows joining a container via {@link LiveShareClient.join}.
 * Use {@link AzureLiveShareClient.getContainer} and {@link AzureLiveShareClient.createContainer} for more fine-grained control of connecting to containers.
 * This ensures you can still use {@link LiveDataObject} DDS's, and useful Live Share features like {@link BaseLiveShareClient.getDDS}.
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
     * @hidden
     */
    protected getDDSErrorJoinFunctionText: string =
        "getContainer or createContainer";

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
     * See {@link BaseLiveShareClient.results} for more information.
     */
    public get results():
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
          }
        | undefined {
        return this._results;
    }

    /**
     * Creates a new detached container instance in the Azure Fluid Relay.
     *
     * @remarks
     * Internally uses `AzureClient.createContainer`.
     * See the docs for `AzureClient.createContainer` for more information.
     * {@link https://fluidframework.com/docs/api/v2/azure-client/azureclient-class#createcontainer-method}
     *
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
        this._results = await this._client.createContainer(
            schema,
            FluidCompatibilityMode
        );
        if (this._host instanceof AzureLiveShareHost) {
            this._host.setAudience(this._results.services.audience);
        }

        await this.addTurboFolder(this._results.container);

        await this._runtime.start();
        return this._results;
    }

    /**
     * Accesses the existing container given its unique ID in the Azure Fluid Relay.
     *
     * @remarks
     * Internally uses `AzureClient.getContainer`.
     * See the docs for `AzureClient.getContainer` for more information.
     * {@link https://fluidframework.com/docs/api/v2/azure-client/azureclient-class#getcontainer-method}
     *
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
        this._results = await this._client.getContainer(
            id,
            schema,
            FluidCompatibilityMode
        );
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
