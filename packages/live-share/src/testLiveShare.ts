import type {
    AzureContainerServices,
    IUser,
} from "@fluidframework/azure-client";
import type {
    ContainerSchema,
    IFluidContainer,
} from "@fluidframework/fluid-static";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { ILiveShareHost } from "./interfaces";
import { TestLiveShareHost } from "./TestLiveShareHost";
import { ILiveShareClientOptions, LiveShareClient } from "./LiveShareClient";

/**
 * Namespace to interact with the Live Share module-specific part of the SDK when testing on a local machine.
 *
 * @beta
 */
export namespace testLiveShare {
    let host: TestLiveShareHost | undefined;
    let client: LiveShareClient | undefined;
    let initializing = false;

    /**
     * Initializes the Live Share client.
     * @param options Optional. Configuration options passed to the Live Share client.
     *
     * @beta
     */
    export async function initialize(
        options?: ILiveShareClientOptions
    ): Promise<void> {
        if (initializing || client) {
            throw new Error("Live Share has already been initialized.");
        }

        // Initialize test connection options
        options = Object.assign(
            {
                connection: {
                    type: "local",
                    tokenProvider: new InsecureTokenProvider("", {
                        id: "123",
                        name: "Test User",
                    } as IUser),
                    endpoint: "http://localhost:7070",
                },
            },
            options
        );

        try {
            initializing = true;
            host = new TestLiveShareHost(
                options.getLocalTestContainerId,
                options.setLocalTestContainerId
            );
            client = new LiveShareClient(options, host);
        } finally {
            initializing = false;
        }
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
     *
     * @beta
     */
    export async function joinContainer(
        fluidContainerSchema: ContainerSchema,
        onContainerFirstCreated?: (container: IFluidContainer) => void
    ): Promise<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }> {
        if (client) {
            return await client.joinContainer(
                fluidContainerSchema,
                onContainerFirstCreated
            );
        } else {
            throw new Error("Live Share must first be initialized");
        }
    }

    /**
     * @hidden
     * Hide from docs
     * ------
     * Returns the LiveShareHost object. Called by existing apps that use the TeamsFluidClient
     * directly. This prevents existing apps from breaking and will be removed when Live Share
     * goes GA.
     *
     * @beta
     */
    export function getHost(): ILiveShareHost {
        return host!;
    }
}
