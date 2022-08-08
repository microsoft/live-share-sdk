
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    TeamsFluidTokenProvider,
    SharedClock, RoleVerifier,
    TestTeamsClientApi,
    TeamsClientApi,
    ContainerState
} from './internals';
import {
    AzureClient,
    AzureConnectionConfig,
    AzureContainerServices,
    ITelemetryBaseLogger,
    LOCAL_MODE_TENANT_ID
} from "@fluidframework/azure-client";
import { ContainerSchema, IFluidContainer } from "@fluidframework/fluid-static";
import { EphemeralEvent } from "./EphemeralEvent";

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
    private _teamsClient?: TeamsClientApi;
    private readonly _options: ITeamsFluidClientOptions;
    private _clock?: SharedClock;
    private _roleVerifier?: RoleVerifier;

    /**
     * Creates a new `TeamsFluidClient` instance.
     * @param options Configuration options for the client.
     */
    constructor(options?: ITeamsFluidClientOptions) {
        // Save props
        this._options = Object.assign({} as ITeamsFluidClientOptions, options);
    }

    /**
     * If true the client is configured to use a local test server.
     */
    public get isTesting(): boolean {
        return this._options.connection?.tenantId == LOCAL_MODE_TENANT_ID;
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
            const teamsClient = await this.getTeamsClient();
            
            // If not testing locally, get app context and ensure we are in a supported Teams ring
            if (!this.isTesting && teamsClient.app) {
                const context = await teamsClient.app.getContext();
                const ringId = context.app.host.ringId;
                if (typeof ringId === "string" && ["general", "general_gcc", "ring3"].includes(ringId)) {
                    throw new Error("TeamsFluidClient: Live Share is only supported in Teams Developer Preview. For more information, visit https://aka.ms/teamsdeveloperpreview");
                }
            }

            // Configure role verifier and timestamp provider
            const pRoleVerifier = this.initializeRoleVerifier();
            const pTimestampProvider = this.initializeTimestampProvider();

            // Initialize FRS connection config
            let config: AzureConnectionConfig | undefined = this._options.connection;
            if (!config) {
                const frsTenantInfo = await teamsClient.interactive.getFluidTenantInfo();
                config = {
                    tenantId: frsTenantInfo.tenantId,
                    tokenProvider: new TeamsFluidTokenProvider(),
                    orderer: frsTenantInfo.ordererEndpoint,
                    storage: frsTenantInfo.storageEndpoint,
                };
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
    protected initializeRoleVerifier(): Promise<void> {
        if (!this._roleVerifier && !this.isTesting) {
            this._roleVerifier = new RoleVerifier();

            // Register role verifier as current verifier for events
            EphemeralEvent.setRoleVerifier(this._roleVerifier);
        }

        return Promise.resolve();
    }

    /**
     * @hidden
     */
    protected initializeTimestampProvider(): Promise<void> {
        if (!this._clock && !this.isTesting) {
            this._clock = new SharedClock();

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
        const teamsClient = await this.getTeamsClient();

        // Get container ID mapping
        const containerInfo = await teamsClient.interactive.getFluidContainerId();

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
        const teamsClient = await this.getTeamsClient();

        // Create and initialize container
        const { container, services } = await client.createContainer(fluidContainerSchema);
        if (onInitializeContainer) {
            onInitializeContainer(container)
        }

        // Attach container to service
        const newContainerId = await container.attach();

        // Attempt to save container ID mapping
        const containerInfo = await teamsClient.interactive.setFluidContainerId(newContainerId);
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

    private async getTeamsClient(): Promise<TeamsClientApi> {
        if (!this._teamsClient) {
            if (window && !this.isTesting) {
                this._teamsClient = (await import('@microsoft/teams-js') as any) as TeamsClientApi;
            } else {
                this._teamsClient = new TestTeamsClientApi(this._options.getLocalTestContainerId, this._options.setLocalTestContainerId);
            }
        }

        return this._teamsClient;
    }
}
