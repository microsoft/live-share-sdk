import { IFluidContainer, LoadableObjectClass } from "fluid-framework";
import { getContainerSchema } from "../utils";
import {
    AzureClient,
    AzureClientProps,
    AzureContainerServices,
} from "@fluidframework/azure-client";
import { FluidTurboClient } from "./internals";

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
     * @param containerSchema - Container schema for the new container.
     * @returns New detached container instance along with associated services.
     */
    public async createContainer(
        additionalDynamicObjectTypes?: LoadableObjectClass<any>[]
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const schema = getContainerSchema(additionalDynamicObjectTypes);
        this._results = await this._client.createContainer(schema);
        this.registerDynamicObjectListeners();
        return this._results;
    }

    /**
     * Accesses the existing container given its unique ID in the Azure Fluid Relay.
     * @param id - Unique ID of the container in Azure Fluid Relay.
     * @param containerSchema - Container schema used to access data objects in the container.
     * @returns Existing container instance along with associated services.
     */
    public async getContainer(
        id: string,
        additionalDynamicObjectTypes?: LoadableObjectClass<any>[]
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
    }> {
        const schema = getContainerSchema(additionalDynamicObjectTypes);
        this._results = await this._client.getContainer(id, schema);
        this.registerDynamicObjectListeners();
        return this._results;
    }
}
