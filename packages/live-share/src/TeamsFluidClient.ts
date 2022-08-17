
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    TeamsFluidTokenProvider,
    SharedClock, RoleVerifier
} from './internals';
import {
    AzureClient,
    AzureConnectionConfig,
    AzureRemoteConnectionConfig,
    AzureContainerServices,
    ITelemetryBaseLogger
} from "@fluidframework/azure-client";
import { ContainerSchema, IFluidContainer } from "@fluidframework/fluid-static";
import { EphemeralEvent } from "./EphemeralEvent";
import { ILiveShareHost, ContainerState } from './interfaces';
import { TestLiveShareHost } from './TestLiveShareHost';

/**
 * @hidden
 * Map v0.59 orderer endpoints to new v1.0 service endpoints
 */
const ordererEndpointMap = new Map<string, string>()
    .set('https://alfred.westus2.fluidrelay.azure.com', 'https://us.fluidrelay.azure.com')
    .set('https://alfred.westeurope.fluidrelay.azure.com', 'https://eu.fluidrelay.azure.com')
    .set('https://alfred.southeastasia.fluidrelay.azure.com', 'https://global.fluidrelay.azure.com');

/**
 * Options used to configure the `TeamsFluidClient` class.
 */
export interface ITeamsFluidClientOptions {
    /**
     * Optional. Configuration to use when connecting to a custom Azure Fluid Relay instance.
     */
    readonly connection?: AzureConnectionConfig,

     /**
      * Optional. A logger instance to receive diagnostic messages.
      */
    readonly logger?: ITelemetryBaseLogger,

    /**
     * Optional. Function to lookup the ID of the container to use for local testing.
     *
     * @remarks
     * The default implementation attempts to retrieve the containerId from the `window.location.hash`.
     *
     * If the function returns 'undefined' a new container will be created.
     * @returns ID of the container to connect to or `undefined` if a new container should be created.
     */
    readonly getLocalTestContainerId?: () => string|undefined;

    /**
     * Optional. Function to save the ID of a newly created local test container.
     *
     * @remarks
     * The default implementation updates `window.location.hash` with the ID of the newly created
     * container.
     * @param containerId The ID of the container that was created.
     */
     readonly setLocalTestContainerId?: (containerId: string) => void;
}

/**
 * Client used to connect to fluid containers within a Microsoft Teams context.
 */
export class TeamsFluidClient {
    private _host?: ILiveShareHost;
    private readonly _options: ITeamsFluidClientOptions;
    private _clock?: SharedClock;
    private _roleVerifier?: RoleVerifier;

    /**
     * Creates a new `TeamsFluidClient` instance.
     * @param options Optional. Configuration options for the client.
     * @param host Optional. Host for the current Live Share session. If not specified the host 
     * will attempt to be automatically determined.
     */
    constructor(options?: ITeamsFluidClientOptions, host?: ILiveShareHost) {
        // Save props
        this._options = Object.assign({} as ITeamsFluidClientOptions, options);
        this._host = host;
    }

    /**
     * If true the client is configured to use a local test server.
     */
    public get isTesting(): boolean {
        return this._options.connection?.type == 'local';
    }

    /**
     * Number of times the client should attempt to get the ID of the container to join for the
     * current context.
     */
    public maxContainerLookupTries = 3;

    /**
     * Connects to the fluid container for the current teams context.
     *
     * @remarks
     * The first client joining the container will create the container resulting in the
     * `onContainerFirstCreated` callback being called. This callback can be used to set the initial
     * state of of the containers object prior to the container being attached.
     * @param fluidContainerSchema Fluid objects to create.
     * @param onContainerFirstCreated Optional. Callback that's called when the container is first created.
     * @returns The fluid `container` and `services` objects to use along with a `created` flag that if true means the container had to be created.
     */
    public async joinContainer(fluidContainerSchema: ContainerSchema, onContainerFirstCreated?: (container: IFluidContainer) => void): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }> {
        performance.mark(`TeamsSync: join container`);
        try {
            const host = await this.getHost();
            
            // Configure role verifier and timestamp provider
            const pRoleVerifier = this.initializeRoleVerifier();
            const pTimestampProvider = this.initializeTimestampProvider();

            // Initialize FRS connection config
            let config: AzureConnectionConfig | undefined = this._options.connection;
            if (!config) {
                const frsTenantInfo = await host.getFluidTenantInfo();
                
                // Compute endpoint
                let endpoint = frsTenantInfo.serviceEndpoint;
                if (!endpoint) {
                    if (ordererEndpointMap.has(frsTenantInfo.ordererEndpoint)) {
                        endpoint = ordererEndpointMap.get(frsTenantInfo.ordererEndpoint);
                    } else {
                        throw new Error(`TeamsFluidClient: Unable to find fluid endpoint for: ${frsTenantInfo.ordererEndpoint}`)
                    }
                }

                // Is this a local config?
                if (frsTenantInfo.tenantId == 'local') {
                    config = {
                        type: 'local',
                        endpoint: endpoint!,
                        tokenProvider: new TeamsFluidTokenProvider(host)
                    };
                } else {
                    config = {
                        type: 'remote',
                        tenantId: frsTenantInfo.tenantId,
                        endpoint: endpoint!,
                        tokenProvider: new TeamsFluidTokenProvider(host)
                    } as AzureRemoteConnectionConfig;
                }
            }

            // Create FRS client
            const client = new AzureClient({
                connection: config,
                logger: this._options.logger
            });

            // Create container on first access
            const pContainer = this.getOrCreateContainer(client, fluidContainerSchema, 0, onContainerFirstCreated);

            // Wait in parallel for everything to finish initializing.
            const result = await Promise.all([pContainer, pRoleVerifier, pTimestampProvider]);

            performance.mark(`TeamsSync: container connecting`);

            // Wait for containers socket to connect
            let connected = false;
            const { container, services } = result[0];
            container.on('connected', async () => {
                if (!connected) {
                    connected = true;
                    performance.measure(`TeamsSync: container connected`, `TeamsSync: container connecting`);
                }

                // Register any new clientId's
                // - registerClientId() will only register a client on first use
                if (this._roleVerifier) {
                    const connections = services.audience.getMyself()?.connections ?? [];
                    for (let i = 0; i < connections.length; i++) {
                        try {
                            const clientId = connections[i]?.id;
                            if (clientId) {
                                await this._roleVerifier?.registerClientId(clientId);
                            }
                        } catch (err: any) {
                            console.error(err.toString());
                        }
                    }
                }
            });

            return result[0];
        } finally {
            performance.measure(`TeamsSync: container joined`, `TeamsSync: join container`);
        }
    }

    /**
     * @hidden
     */
    protected async initializeRoleVerifier(): Promise<void> {
        if (!this._roleVerifier && !this.isTesting) {
            const host = await this.getHost();
            this._roleVerifier = new RoleVerifier(host);

            // Register role verifier as current verifier for events
            EphemeralEvent.setRoleVerifier(this._roleVerifier);
        }

        return Promise.resolve();
    }

    /**
     * @hidden
     */
    protected async initializeTimestampProvider(): Promise<void> {
        if (!this._clock && !this.isTesting) {
            const host = await this.getHost();
            this._clock = new SharedClock(host);

            // Register clock as current timestamp provider for events
            EphemeralEvent.setTimestampProvider(this._clock);

            // Start the clock
            return this._clock.start();
        } else {
            return Promise.resolve();
        }
    }

    private async getOrCreateContainer(client: AzureClient, fluidContainerSchema: ContainerSchema, tries: number, onInitializeContainer?: (container: IFluidContainer) => void): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }> {
        const host = await this.getHost();

        // Get container ID mapping
        const containerInfo = await host.getFluidContainerId();

        // Create container on first access
        if (containerInfo.shouldCreate) {
            return await this.createNewContainer(client, fluidContainerSchema, tries, onInitializeContainer);
        } else if (containerInfo.containerId) {
            return {created: false, ...await client.getContainer(containerInfo.containerId, fluidContainerSchema)};
        } else if (tries < this.maxContainerLookupTries && containerInfo.retryAfter > 0) {
            await this.wait(containerInfo.retryAfter);
            return await this.getOrCreateContainer(client, fluidContainerSchema, tries + 1, onInitializeContainer);
        } else {
            throw new Error(`TeamsFluidClient: timed out attempting to create or get container for current context.`);
        }
    }

    private async createNewContainer(client: AzureClient, fluidContainerSchema: ContainerSchema, tries: number, onInitializeContainer?: (container: IFluidContainer) => void): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }> {
        const host = await this.getHost();

        // Create and initialize container
        const { container, services } = await client.createContainer(fluidContainerSchema);
        if (onInitializeContainer) {
            onInitializeContainer(container)
        }

        // Attach container to service
        const newContainerId = await container.attach();

        // Attempt to save container ID mapping
        const containerInfo = await host.setFluidContainerId(newContainerId);
        if (containerInfo.containerState != ContainerState.added) {
            // Delete created container
            container.dispose();

            // Get mapped container ID
            return {created: false, ...await client.getContainer(containerInfo.containerId!, fluidContainerSchema)};
        } else {
            return {container, services, created: true};
        }
    }

    private wait(delay: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), delay);
        });
    }

    private async getHost(): Promise<ILiveShareHost> {
        if (!this._host) {
            if (window && !this.isTesting) {
                const teamsClient = (await import('@microsoft/teams-js') as any) as ITeamsClientApi;
                if (teamsClient && teamsClient.liveShare) {
                    this._host = teamsClient.liveShare.getHost();
                } else {
                    throw new Error(`TeamsFluidClient: The Live Share Host could not be automatically identified.`);
                }
            } else {
                this._host = new TestLiveShareHost(this._options.getLocalTestContainerId, this._options.setLocalTestContainerId);
            }
        }

        return this._host;
    }
}

interface ITeamsClientApi {
    liveShare: {
        getHost(): ILiveShareHost;
    }
}