/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ContainerSchema,
    IFluidContainer,
    LoadableObjectClassRecord,
} from "fluid-framework";
import {
    AzureClient,
    AzureClientProps,
    AzureContainerServices,
} from "@fluidframework/azure-client";
import {
    AzureLiveShareHost,
    ILiveShareHost,
    LiveShareRuntime,
    getLiveShareContainerSchemaProxy,
} from "@microsoft/live-share";
import { FluidTurboClient } from "./FluidTurboClient";

/**
 * The `FluidTurboClient` implementation for the `AzureClient`.
 * @see FluidTurboClient
 */
export class AzureTurboClient extends FluidTurboClient {
    private _host: ILiveShareHost;
    private _client: AzureClient;
    private _results:
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
          }
        | undefined;
    private _runtime: LiveShareRuntime | null = null;
    protected _canSendBackgroundUpdates: boolean = true;

    /**
     * Creates a new client instance using configuration parameters.
     * @param props - Properties for initializing a new AzureClient instance
     */
    constructor(
        props: AzureClientProps,
        host: ILiveShareHost = AzureLiveShareHost.create(true)
    ) {
        super();
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
     * Setting for whether `LiveDataObject` instances using `LiveObjectSynchronizer` can send background updates.
     * Default value is `true`.
     *
     * @remarks
     * This is useful for scenarios where there are a large number of participants in a session, since service performance degrades as more socket connections are opened.
     * Intended for use when a small number of users are intended to be "in control", such as the `LiveFollowMode` class's `startPresenting()` feature.
     * Set to true when the user is eligible to send background updates (e.g., "in control"), or false when that user is not in control.
     * This setting will not prevent the local user from explicitly changing the state of objects using `LiveObjectSynchronizer`, such as `.set()` in `LiveState`.
     * Impacts background updates of `LiveState`, `LivePresence`, `LiveTimer`, and `LiveFollowMode`.
     */
    public get canSendBackgroundUpdates(): boolean {
        if (this._runtime) {
            return this._runtime.canSendBackgroundUpdates;
        }
        return this._canSendBackgroundUpdates;
    }

    public set canSendBackgroundUpdates(value: boolean) {
        this._canSendBackgroundUpdates = value;
        if (!this._runtime) return;
        this._runtime.canSendBackgroundUpdates = value;
    }

    /**
     * Creates a new detached container instance in the Azure Fluid Relay.
     * @param initialObjects Optional. Fluid ContainerSchema initialObjects.
     * @param host Optional. ILiveShareHost implementation to use when using Live Share DDS's.
     * @returns New detached container instance along with associated services.
     */
    public async createContainer(
        initialObjects?: LoadableObjectClassRecord
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const { runtime, schema } = this.getContainerSetup(initialObjects);
        this._results = await this._client.createContainer(schema);
        if (this._host instanceof AzureLiveShareHost) {
            this._host.setAudience(this._results.services.audience);
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
        initialObjects?: LoadableObjectClassRecord
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const { runtime, schema } = this.getContainerSetup(initialObjects);
        this._results = await this._client.getContainer(id, schema);
        if (this._host instanceof AzureLiveShareHost) {
            this._host.setAudience(this._results.services.audience);
        }
        await runtime.start();
        return this._results;
    }

    private getContainerSetup(initialObjects?: LoadableObjectClassRecord): {
        schema: ContainerSchema;
        runtime: LiveShareRuntime;
    } {
        const runtime = new LiveShareRuntime(this._host);
        runtime.canSendBackgroundUpdates = this._canSendBackgroundUpdates;
        // Store reference in client to runtime
        this._runtime = runtime;
        const schema = getLiveShareContainerSchemaProxy(
            this.getContainerSchema(initialObjects),
            runtime
        );
        return {
            schema,
            runtime,
        };
    }
}
