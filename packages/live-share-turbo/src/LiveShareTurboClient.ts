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
import { FluidTurboClient } from "./FluidTurboClient";

/**
 * The `FluidTurboClient` implementation for the `LiveShareClient`.
 * @see FluidTurboClient
 */
export class LiveShareTurboClient extends FluidTurboClient {
    private _client: LiveShareClient;
    private _results: ILiveShareJoinResults | undefined;

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
    public override get results(): ILiveShareJoinResults | undefined {
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
        return this._client.canSendBackgroundUpdates;
    }

    public set canSendBackgroundUpdates(value: boolean) {
        this._client.canSendBackgroundUpdates = value;
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
        const schema = this.getContainerSchema(initialObjects);
        this._results = await this._client.joinContainer(
            schema,
            onContainerFirstCreated
        );
        return this._results;
    }
}
