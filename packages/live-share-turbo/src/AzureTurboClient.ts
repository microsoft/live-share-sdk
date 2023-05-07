/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ContainerSchema, IFluidContainer, LoadableObjectClassRecord } from "fluid-framework";
import {
    AzureClient,
    AzureClientProps,
    AzureContainerServices,
} from "@fluidframework/azure-client";
import { FluidTurboClient, getContainerSchema } from "./internals";
import {
    AzureLiveShareHost,
    ILiveShareHost,
    LiveShareRuntime,
    LocalTimestampProvider,
    getLiveShareContainerSchemaProxy,
} from "@microsoft/live-share";

/**
 * The `FluidTurboClient` implementation for the `AzureClient`.
 * @see FluidTurboClient
 */
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
     * @param host Optional. ILiveShareHost implementation to use when using Live Share DDS's.
     * @returns New detached container instance along with associated services.
     */
    public async createContainer(
        initialObjects?: LoadableObjectClassRecord,
        host?: ILiveShareHost
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const { host:hostInUse, runtime, schema } = this.getContainerSetup(initialObjects, host);
        this._results = await this._client.createContainer(schema);
        if (hostInUse instanceof AzureLiveShareHost) {
            hostInUse.setAudience(this._results.services.audience);
        }
        await runtime.start();
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
        initialObjects?: LoadableObjectClassRecord,
        host?: ILiveShareHost
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const { host:hostInUse, runtime, schema } = this.getContainerSetup(initialObjects, host);
        this._results = await this._client.getContainer(id, schema);
        if (hostInUse instanceof AzureLiveShareHost) {
            hostInUse.setAudience(this._results.services.audience);
        }
        await runtime.start();
        return this._results;
    }

    private getContainerSetup(
        initialObjects?: LoadableObjectClassRecord,
        host?: ILiveShareHost
    ): {
        schema: ContainerSchema,
        runtime: LiveShareRuntime,
        host: ILiveShareHost,
    } {
        const _host = host || AzureLiveShareHost.create(true);
        const timestampProvider = !host
            ? new LocalTimestampProvider()
            : undefined;
        const runtime = new LiveShareRuntime(_host, timestampProvider);
        const schema = getLiveShareContainerSchemaProxy(
            getContainerSchema(initialObjects),
            runtime
        );
        return {
            schema,
            runtime,
            host: _host,
        };
    };
}
