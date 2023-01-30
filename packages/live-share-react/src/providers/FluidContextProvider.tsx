/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IFluidContainer, LoadableObjectClass } from "fluid-framework";
import React from "react";
import {
    AzureClientProps,
    AzureContainerServices,
} from "@fluidframework/azure-client";
import { IAzureContainerResults } from "../types";
import {
    ISharedStateRegistryResponse,
    useSharedStateRegistry,
} from "../internal-hooks";
import {
    AzureTurboClient,
    IFluidTurboClient,
} from "@microsoft/live-share-turbo";

interface IFluidContext extends ISharedStateRegistryResponse {
    clientRef: React.MutableRefObject<IFluidTurboClient>;
    container: IFluidContainer | undefined;
    services: AzureContainerServices | undefined;
    joinError: Error | undefined;
    getContainer: (containerId: string) => Promise<IAzureContainerResults>;
    createContainer: (
        onInitializeContainer?: (container: IFluidContainer) => void
    ) => Promise<IAzureContainerResults>;
}

export const FluidContext = React.createContext<IFluidContext>(
    {} as IFluidContext
);

export const useFluidObjectsContext = (): IFluidContext => {
    const context = React.useContext(FluidContext);
    return context;
};

interface IFluidContextProviderProps {
    clientOptions: AzureClientProps;
    containerId?: string;
    createOnLoad?: boolean;
    joinOnLoad?: boolean;
    children?: React.ReactNode;
}

/**
 * React Context provider component for using Fluid data objects & joining/creating a Fluid document `AzureClient`.
 */
export const FluidContextProvider: React.FC<IFluidContextProviderProps> = (
    props
) => {
    const startedRef = React.useRef<boolean>(false);
    const clientRef = React.useRef<AzureTurboClient>(
        new AzureTurboClient(props.clientOptions)
    );
    const [results, setResults] = React.useState<
        IAzureContainerResults | undefined
    >();
    const [joinError, setJoinError] = React.useState<Error | undefined>();

    const stateRegistryCallbacks = useSharedStateRegistry(results);

    /**
     * Get the container for a given containerId using AzureClient
     */
    const getContainer = React.useCallback(
        async (containerId: string): Promise<IAzureContainerResults> => {
            return new Promise(async (resolve, reject) => {
                try {
                    const results: IAzureContainerResults =
                        await clientRef.current.getContainer(containerId);
                    setResults(results);
                    resolve(results);
                } catch (error: any) {
                    if (error instanceof Error) {
                        setJoinError(error);
                    }
                    reject(error);
                }
            });
        },
        [props.containerId, setResults]
    );

    /**
     * Create container callback to create a new container using AzureClient
     */
    const createContainer = React.useCallback(
        async (
            onInitializeContainer?: (container: IFluidContainer) => void
        ): Promise<IAzureContainerResults> => {
            return new Promise(async (resolve, reject) => {
                try {
                    const results: IAzureContainerResults =
                        await clientRef.current.createContainer();
                    if (onInitializeContainer) {
                        onInitializeContainer(results.container);
                    }
                    const containerId = await results.container.attach();
                    window.location.hash = containerId;
                    setResults(results);
                    resolve(results);
                } catch (error: any) {
                    if (error instanceof Error) {
                        setJoinError(error);
                    }
                    reject(error);
                }
            });
        },
        [props.containerId, setResults]
    );

    /**
     * Joins a container if `props.joinOnLoad` is true and `props.containerId` is known. Creates a new container if `props.createOnLoad` is true
     * and `props.containerId` is not known.
     */
    React.useEffect(() => {
        if (
            results?.container?.connectionState !== undefined ||
            startedRef.current
        )
            return;
        startedRef.current = true;
        if (props.containerId && props.joinOnLoad) {
            getContainer(props.containerId);
        } else if (!props.containerId && props.createOnLoad) {
            createContainer();
        }
    }, [
        results?.container?.connectionState,
        props.containerId,
        props.createOnLoad,
        props.joinOnLoad,
        getContainer,
        createContainer,
    ]);

    return (
        <FluidContext.Provider
            value={{
                clientRef,
                container: results?.container,
                services: results?.services,
                joinError,
                createContainer,
                getContainer,
                ...stateRegistryCallbacks,
            }}
        >
            {props.children}
        </FluidContext.Provider>
    );
};
