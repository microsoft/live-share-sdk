/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IFluidContainer, LoadableObjectClass } from "fluid-framework";
import React from "react";
import { ILiveShareContainerResults } from "../types";
import { useSharedStateRegistry } from "../internal-hooks";
import { ILiveShareClientOptions, ILiveShareHost } from "@microsoft/live-share";
import { FluidContext } from "./FluidContextProvider";
import { LiveShareTurboClient } from "@microsoft/live-share-turbo";

interface ILiveShareContext {
    created: boolean | undefined;
    join: (
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
        new LiveShareTurboClient(props.host, props.clientOptions)
    );
    const [results, setResults] = React.useState<
        ILiveShareContainerResults | undefined
    >();
    const [joinError, setJoinError] = React.useState<Error | undefined>();

    const stateRegistryCallbacks = useSharedStateRegistry(results);

    /**
     * Join container callback for joining the Live Share session
     */
    const join = React.useCallback(
        async (
            onInitializeContainer?: (container: IFluidContainer) => void
        ): Promise<ILiveShareContainerResults> => {
            const results: ILiveShareContainerResults =
                await clientRef.current.join(onInitializeContainer);
            setResults(results);
            return results;
        },
        []
    );

    /**
     * Joins the container on load if `props.joinOnLoad` is true
     */
    React.useEffect(() => {
        if (results?.created !== undefined || startedRef.current) return;
        startedRef.current = true;
        if (props.joinOnLoad) {
            join().catch((error) => {
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
    }, [results?.created, props.joinOnLoad, join]);

    return (
        <LiveShareContext.Provider
            value={{
                created: results?.created,
                join,
            }}
        >
            <FluidContext.Provider
                value={{
                    clientRef,
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
                }}
            >
                {props.children}
            </FluidContext.Provider>
        </LiveShareContext.Provider>
    );
};
