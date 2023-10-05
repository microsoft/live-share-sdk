/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveShareTokenProvider, getInsecureTokenProvider } from "./internals";
import {
    AzureClient,
    AzureContainerServices,
    AzureLocalConnectionConfig,
    AzureRemoteConnectionConfig,
    ITelemetryBaseLogger,
} from "@fluidframework/azure-client";
import { ContainerSchema, IFluidContainer } from "@fluidframework/fluid-static";
import {
    ILiveShareHost,
    ContainerState,
    ITimestampProvider,
    IRoleVerifier,
    ILiveShareJoinResults,
} from "./interfaces";
import { LocalTimestampProvider } from "./LocalTimestampProvider";
import { TestLiveShareHost } from "./TestLiveShareHost";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { getLiveShareContainerSchemaProxy } from "./schema-injection-utils";

/**
 * @hidden
 * Map v0.59 orderer endpoints to new v1.0 service endpoints
 */
const serviceEndpointMap = new Map<string | undefined, string>()
    .set(
        "https://alfred.westus2.fluidrelay.azure.com",
        "https://us.fluidrelay.azure.com"
    )
    .set(
        "https://alfred.westeurope.fluidrelay.azure.com",
        "https://eu.fluidrelay.azure.com"
    )
    .set(
        "https://alfred.southeastasia.fluidrelay.azure.com",
        "https://global.fluidrelay.azure.com"
    );

/**
 * Options used to configure the `LiveShareClient` class.
 */
export interface ILiveShareClientOptions {
    /**
     * Optional. Configuration to use when connecting to a custom Azure Fluid Relay instance.
     */
    readonly connection?:
        | AzureRemoteConnectionConfig
        | AzureLocalConnectionConfig;

    /**
     * Optional. A logger instance to receive diagnostic messages.
     */
    readonly logger?: ITelemetryBaseLogger;

    /**
     * Optional. Custom timestamp provider to use.
     */
    readonly timestampProvider?: ITimestampProvider;

    /**
     * Optional. Custom role verifier to use.
     */
    readonly roleVerifier?: IRoleVerifier;

    /**
     * Optional. Setting for whether `LiveDataObject` instances using `LiveObjectSynchronizer` can send background updates.
     * Default value is `true`.
     *
     * @remarks
     * This is useful for scenarios where there are a large number of participants in a session, since service performance degrades as more socket connections are opened.
     * Intended for use when a small number of users are intended to be "in control", such as the `LiveFollowMode` class's `startPresenting()` feature.
     * There should always be at least one user in the session that has `canSendBackgroundUpdates` set to true.
     * Set to true when the user is eligible to send background updates (e.g., "in control"), or false when that user is not in control.
     * This setting will not prevent the local user from explicitly changing the state of objects using `LiveObjectSynchronizer`, such as `.set()` in `LiveState`.
     * Impacts background updates of `LiveState`, `LivePresence`, `LiveTimer`, and `LiveFollowMode`.
     */
    canSendBackgroundUpdates?: boolean;
}

/**
 * Client used to connect to fluid containers within a Microsoft Teams context.
 */
export class LiveShareClient {
    private _host: ILiveShareHost = TestLiveShareHost.create(
        undefined,
        undefined
    );
    private readonly _options: ILiveShareClientOptions;
    private readonly _runtime: LiveShareRuntime;
    private _results: ILiveShareJoinResults | undefined;

    /**
     * Creates a new `LiveShareClient` instance.
     * @param host Host for the current Live Share session.
     * @param options Optional. Configuration options for the client.
     */
    constructor(host: ILiveShareHost, options?: ILiveShareClientOptions) {
        // Validate host passed in
        if (!host) {
            throw new Error(
                `LiveShareClient: prop \`host\` is \`${host}\` when it is expected to be a non-optional value of type \`ILiveShareHost\`. Please ensure \`host\` is defined before initializing \`LiveShareClient\`.`
            );
        }
        if (typeof host.getFluidTenantInfo != "function") {
            throw new Error(
                `LiveShareClient: \`host.getFluidTenantInfo\` is of type \`${typeof host.getFluidTenantInfo}\` when it is expected to be a type of \`function\`. For more information, review the \`ILiveShareHost\` interface.`
            );
        }
        this._host = host;
        // Save options
        this._options = {
            ...options,
            timestampProvider: getIsTestClient(host, options)
                ? new LocalTimestampProvider()
                : options?.timestampProvider,
        };
        this._runtime = new LiveShareRuntime(this._host, this._options, true);
    }

    /**
     * If true the client is configured to use a local test server.
     */
    public get isTesting(): boolean {
        return getIsTestClient(this._host, this._options);
    }

    /**
     * Number of times the client should attempt to get the ID of the container to join for the
     * current context.
     */
    public maxContainerLookupTries = 3;

    /**
     * Setting for whether `LiveDataObject` instances using `LiveObjectSynchronizer` can send background updates.
     * Default value is `true`.
     *
     * @remarks
     * This is useful for scenarios where there are a large number of participants in a session, since service performance degrades as more socket connections are opened.
     * Intended for use when a small number of users are intended to be "in control", such as the `LiveFollowMode` class's `startPresenting()` feature.
     * There should always be at least one user in the session that has `canSendBackgroundUpdates` set to true.
     * Set to true when the user is eligible to send background updates (e.g., "in control"), or false when that user is not in control.
     * This setting will not prevent the local user from explicitly changing the state of objects using `LiveObjectSynchronizer`, such as `.set()` in `LiveState`.
     * Impacts background updates of `LiveState`, `LivePresence`, `LiveTimer`, and `LiveFollowMode`.
     */
    public get canSendBackgroundUpdates(): boolean {
        return this._runtime.canSendBackgroundUpdates;
    }

    public set canSendBackgroundUpdates(value: boolean) {
        this._runtime.canSendBackgroundUpdates = value;
    }

    /**
     * Connects to the fluid container for the current teams context.
     *
     * @remarks
     * The first client joining the container will create the container resulting in the
     * `onContainerFirstCreated` callback being called. This callback can be used to set the initial
     * state of of the containers object prior to the container being attached.
     * @param fluidContainerSchema Fluid objects to create.
     * @param onContainerFirstCreated Optional. Callback that's called when the container is first created.
     * @returns the results of join container.
     */
    public async joinContainer(
        fluidContainerSchema: ContainerSchema,
        onContainerFirstCreated?: (container: IFluidContainer) => void
    ): Promise<ILiveShareJoinResults> {
        performance.mark(`TeamsSync: join container`);
        try {
            // Start runtime if needed
            const pStartRuntime = this._runtime.start();

            // Apply runtime to ContainerSchema
            const schema = getLiveShareContainerSchemaProxy(
                fluidContainerSchema,
                this._runtime
            );

            // Initialize FRS connection config
            let config:
                | AzureRemoteConnectionConfig
                | AzureLocalConnectionConfig
                | undefined = this._options.connection;
            if (!config) {
                const frsTenantInfo = await this._host.getFluidTenantInfo();

                // Compute endpoint
                let endpoint: string | undefined =
                    frsTenantInfo.serviceEndpoint;
                if (!endpoint) {
                    if (serviceEndpointMap.has(frsTenantInfo.serviceEndpoint)) {
                        endpoint = serviceEndpointMap.get(
                            frsTenantInfo.serviceEndpoint
                        );
                    } else {
                        throw new Error(
                            `LiveShareClient: Unable to find fluid endpoint for: ${frsTenantInfo.serviceEndpoint}`
                        );
                    }
                }

                // Is this a local config?
                if (frsTenantInfo.tenantId == "local") {
                    config = {
                        type: "local",
                        endpoint: endpoint!,
                        tokenProvider: await getInsecureTokenProvider(),
                    };
                } else {
                    config = {
                        type: "remote",
                        tenantId: frsTenantInfo.tenantId,
                        endpoint: endpoint!,
                        tokenProvider: new LiveShareTokenProvider(this._host),
                    } as AzureRemoteConnectionConfig;
                }
            }

            // Create FRS client
            const client = new AzureClient({
                connection: config,
                logger: this._options.logger,
            });

            // Create container on first access
            const pContainer = this.getOrCreateContainer(
                client,
                schema,
                0,
                onContainerFirstCreated
            );

            // Wait in parallel for everything to finish initializing.
            const result = await Promise.all([pContainer, pStartRuntime]);
            this._runtime.setAudience(result[0].services.audience);

            performance.mark(`TeamsSync: container connecting`);

            this._results = {
                ...result[0],
                timestampProvider: this._runtime.timestampProvider,
            };
            return this._results;
        } finally {
            performance.measure(
                `TeamsSync: container joined`,
                `TeamsSync: join container`
            );
        }
    }

    private async getOrCreateContainer(
        client: AzureClient,
        fluidContainerSchema: ContainerSchema,
        tries: number,
        onInitializeContainer?: (container: IFluidContainer) => void
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }> {
        // Get container ID mapping
        const containerInfo = await this._host.getFluidContainerId();

        // Create container on first access
        if (containerInfo.shouldCreate) {
            return await this.createNewContainer(
                client,
                fluidContainerSchema,
                tries,
                onInitializeContainer
            );
        } else if (containerInfo.containerId) {
            return {
                created: false,
                ...(await client.getContainer(
                    containerInfo.containerId,
                    fluidContainerSchema
                )),
            };
        } else if (
            tries < this.maxContainerLookupTries &&
            containerInfo.retryAfter > 0
        ) {
            await this.wait(containerInfo.retryAfter);
            return await this.getOrCreateContainer(
                client,
                fluidContainerSchema,
                tries + 1,
                onInitializeContainer
            );
        } else {
            throw new Error(
                `LiveShareClient: timed out attempting to create or get container for current context.`
            );
        }
    }

    private async createNewContainer(
        client: AzureClient,
        fluidContainerSchema: ContainerSchema,
        tries: number,
        onInitializeContainer?: (container: IFluidContainer) => void
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }> {
        // Create and initialize container
        const { container, services } = await client.createContainer(
            fluidContainerSchema
        );
        if (onInitializeContainer) {
            onInitializeContainer(container);
        }

        // Attach container to service
        const newContainerId = await container.attach();

        // Attempt to save container ID mapping
        const containerInfo = await this._host.setFluidContainerId(
            newContainerId
        );
        if (containerInfo.containerState != ContainerState.added) {
            // Delete created container
            container.dispose();

            // Get mapped container ID
            return {
                created: false,
                ...(await client.getContainer(
                    containerInfo.containerId!,
                    fluidContainerSchema
                )),
            };
        } else {
            return { container, services, created: true };
        }
    }

    private wait(delay: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), delay);
        });
    }
}

function getIsTestClient(
    host: ILiveShareHost,
    options?: ILiveShareClientOptions
) {
    return (
        options?.connection?.type == "local" ||
        host instanceof TestLiveShareHost
    );
}
