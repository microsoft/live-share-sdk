import { IFluidContainer, LoadableObjectClass } from "fluid-framework";
import {
    LiveShareClient,
    ILiveShareClientOptions,
    ILiveShareHost,
} from "@microsoft/live-share";
import { getLiveShareContainerSchema } from "./utils";
import { AzureContainerServices } from "@fluidframework/azure-client";
import { FluidTurboClient } from "./internals";

export class LiveShareTurboClient extends FluidTurboClient {
    private _client: LiveShareClient;
    private _results:
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
              created: boolean;
          }
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
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
              created: boolean;
          }
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
     * @param fluidContainerSchema Fluid objects to create.
     * @param onContainerFirstCreated Optional. Callback that's called when the container is first created.
     * @returns The fluid `container` and `services` objects to use along with a `created` flag that if true means the container had to be created.
     */
    public async join(
        additionalDynamicObjectTypes?: LoadableObjectClass<any>[],
        onContainerFirstCreated?: (container: IFluidContainer) => void
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }> {
        const schema = getLiveShareContainerSchema(
            additionalDynamicObjectTypes
        );
        this._results = await this._client.joinContainer(
            schema,
            onContainerFirstCreated
        );
        this.registerDynamicObjectListeners();
        return this._results;
    }
}