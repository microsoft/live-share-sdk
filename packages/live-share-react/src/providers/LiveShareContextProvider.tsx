import { IFluidContainer, LoadableObjectClass } from "fluid-framework";
import React from "react";
import { ILiveShareContainerResults } from "../types";
import {
    useDynamicDDSRegistry,
    useSharedStateRegistry,
} from "../internal-hooks";
import {
    ILiveShareClientOptions,
    LiveShareClient,
    ILiveShareHost,
} from "@microsoft/live-share";
import { FluidContext } from "./FluidContextProvider";
import { getLiveShareContainerSchema } from "../utils";

interface ILiveShareContext {
    created: boolean | undefined;
    joinContainer: (
        onInitializeContainer?: (container: IFluidContainer) => void
    ) => Promise<ILiveShareContainerResults>;
}

export const LiveShareContext = React.createContext<ILiveShareContext>(
    {} as ILiveShareContext
);

export const useLiveShareContext = (): ILiveShareContext => {
    const context = React.useContext(LiveShareContext);
    return context;
};

interface ILiveShareContextProviderProps {
    /**
     * Optional. Array of additional dynamic object types to include in the Fluid container schema
     */
    additionalDynamicObjectTypes?: LoadableObjectClass<any>[];
    /**
     * Optional. React children node for the React Context Provider
     */
    children?: React.ReactNode;
    /**
     * Optional. Options to pass into LiveShareClient initializer
     */
    clientOptions?: ILiveShareClientOptions;
    /**
     * Host to initialize LiveShareClient with
     */
    host: ILiveShareHost;
    /**
     * Optional. Flag to determine whether to join Fluid container on load
     */
    joinOnLoad?: boolean;
}

/**
 * React Context provider component for using Live Share data objects & joining a Live Share session using `LiveShareClient`.
 */
export const LiveShareContextProvider: React.FC<
    ILiveShareContextProviderProps
> = (props) => {
    const startedRef = React.useRef(false);
    const clientRef = React.useRef(
        new LiveShareClient(props.host, props.clientOptions)
    );
    const [results, setResults] = React.useState<
        ILiveShareContainerResults | undefined
    >();
    const [joinError, setJoinError] = React.useState<Error | undefined>();

    const stateRegistryCallbacks = useSharedStateRegistry(results);
    const ddsRegistryCallbacks = useDynamicDDSRegistry(results);

    /**
     * Join container callback for joining the Live Share session
     */
    const joinContainer = React.useCallback(
        async (
            onInitializeContainer?: (container: IFluidContainer) => void
        ): Promise<ILiveShareContainerResults> => {
            const results: ILiveShareContainerResults =
                await clientRef.current.joinContainer(
                    getLiveShareContainerSchema(
                        props.additionalDynamicObjectTypes
                    ),
                    onInitializeContainer
                );
            setResults(results);
            return results;
        },
        [props.additionalDynamicObjectTypes, setResults]
    );

    /**
     * Joins the container on load if `props.joinOnLoad` is true
     */
    React.useEffect(() => {
        if (results?.created !== undefined || startedRef.current) return;
        startedRef.current = true;
        if (props.joinOnLoad) {
            joinContainer().catch((error) => {
                if (error instanceof Error) {
                    setJoinError(error);
                } else {
                    setJoinError(
                        new Error(
                            "LiveShareContextProvider: An unknown error occurred while joining container."
                        )
                    );
                }
            });
        }
    }, [results?.created, props.joinOnLoad, joinContainer]);

    return (
        <LiveShareContext.Provider
            value={{
                created: results?.created,
                joinContainer,
            }}
        >
            <FluidContext.Provider
                value={{
                    container: results?.container,
                    services: results?.services,
                    joinError,
                    getContainer: async () => {
                        throw new Error(
                            "Cannot join new container through getContainer in LiveShareContextProvider"
                        );
                    },
                    createContainer: async () => {
                        throw new Error(
                            "Cannot create new container through createContainer in LiveShareContextProvider"
                        );
                    },
                    ...stateRegistryCallbacks,
                    ...ddsRegistryCallbacks,
                }}
            >
                {props.children}
            </FluidContext.Provider>
        </LiveShareContext.Provider>
    );
};
