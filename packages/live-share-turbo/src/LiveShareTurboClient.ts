/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IFluidContainer, LoadableObjectClassRecord } from "fluid-framework";
import {
    LiveShareClient,
    ILiveShareClientOptions,
    ILiveShareHost,
    ILiveShareJoinResults,
} from "@microsoft/live-share";
import { AzureContainerServices } from "@fluidframework/azure-client";
import { FluidTurboClient, getContainerSchema } from "./internals";

/**
 * The `FluidTurboClient` implementation for the `LiveShareClient`.
 * @see FluidTurboClient
 */
export class LiveShareTurboClient extends FluidTurboClient {
    private _client: LiveShareClient;
    private _results:
        | ILiveShareJoinResults
        | undefined;

    /**
     * Creates a new `LiveShareTurbo` instance.
     * @param host Host for the current Live Share session.
     * @param options Optional. Configuration options for the client.
     */
    constructor(host: ILiveShareHost, options?: ILiveShareClientOptions) {
        super();
        this._client = new LiveShareClient(host, options);
    }

    /**
     * If true the client is configured to use a local test server.
     */
    public get isTesting(): boolean {
        return this._client.isTesting;
    }

    /**
     * Number of times the client should attempt to get the ID of the container to join for the
     * current context.
     */
    public get maxContainerLookupTries(): number {
        return this._client.maxContainerLookupTries;
    }

    /**
     * Set number of times the client should attempt to get the ID of the container to join for the
     * current context.
     */
    public set maxContainerLookupTries(value: number) {
        this._client.maxContainerLookupTries = value;
    }

    /**
     * Get the Fluid join container results
     */
    public override get results():
        | ILiveShareJoinResults
        | undefined {
        return this._results;
    }

    /**
     * Connects to the fluid container for the current teams context.
     *
     * @remarks
     * The first client joining the container will create the container resulting in the
     * `onContainerFirstCreated` callback being called. This callback can be used to set the initial
     * state of of the containers object prior to the container being attached.
     * @param initialObjects Optional. Fluid ContainerSchema initialObjects.
     * @param onContainerFirstCreated Optional. Callback that's called when the container is first created.
     * @returns The fluid `container` and `services` objects to use along with a `created` flag that if true means the container had to be created.
     */
    public async join(
        initialObjects?: LoadableObjectClassRecord,
        onContainerFirstCreated?: (container: IFluidContainer) => void
    ): Promise<ILiveShareJoinResults> {
        const schema = getContainerSchema(initialObjects);
        this._results = await this._client.joinContainer(
            schema,
            onContainerFirstCreated
        );
        return this._results;
    }
}
