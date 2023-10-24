/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IFluidContainer, LoadableObjectClassRecord } from "fluid-framework";
import React from "react";
import {
    AzureClientProps,
    AzureContainerServices,
} from "@fluidframework/azure-client";
import { IAzureContainerResults } from "../types";
import {
    ISharedStateRegistryResponse,
    useSharedStateRegistry,
} from "../shared-hooks";
import {
    AzureTurboClient,
    IFluidTurboClient,
} from "@microsoft/live-share-turbo";

/**
 * React Context provider values for `<AzureProvider>` and `<LiveShareProvider>`.
 *
 * @remarks
 * To get the latest values, use the {@link useFluidObjectsContext} hook.
 */
export interface IFluidContext extends ISharedStateRegistryResponse {
    /**
     * The Fluid Turbo client used for connecting to the Fluid container.
     */
    clientRef: React.MutableRefObject<IFluidTurboClient>;
    /**
     * Stateful Fluid container.
     */
    container: IFluidContainer | undefined;
    /**
     * The Azure container services (e.g., audience).
     */
    services: AzureContainerServices | undefined;
    /**
     * A stateful error object that is set if there was an error connecting to the Fluid container.
     */
    joinError: Error | undefined;
    /**
     * React callback function to connect to an existing Fluid container.
     *
     * @remarks
     * The results will also be set to their stateful counterparts for `container` and `services`.
     *
     * @param containerId the containerId to connect to.
     * @param initialObjects Optional. initial object schema, which should match that passed to `createContainer()`.
     * @returns promise that returns a results object once complete (e.g., container, services, etc.)
     */
    getContainer: (
        containerId: string,
        initialObjects?: LoadableObjectClassRecord
    ) => Promise<IAzureContainerResults>;
    /**
     * React callback function to create and connect to a new Fluid container.
     *
     * @remarks
     * The results will also be set to their stateful counterparts for `container` and `services`.
     *
     * @param initialObjects Optional. The initial object schema to apply to the container.
     * @param onInitializeContainer Optional. A callback for when the container is first initialized, which is useful for setting default values to objects in `initialObjects`.
     * @returns promise that returns a results object once complete (e.g., container, services, etc.)
     */
    createContainer: (
        initialObjects?: LoadableObjectClassRecord,
        onInitializeContainer?: (container: IFluidContainer) => void
    ) => Promise<IAzureContainerResults>;
}

/**
 * @hidden
 */
export const FluidContext = React.createContext<IFluidContext>(
    {} as IFluidContext
);

/**
 * Hook to get the latest React context state for `FluidContext`.
 *
 * @remarks
 * This hook can only be used in a child component of `<LiveShareProvider>` or `<AzureProvider>`.
 *
 * @returns current state of `LiveShareContext`
 */
export const useFluidObjectsContext = (): IFluidContext => {
    const context = React.useContext(FluidContext);
    if (!isFluidObjectsContext(context)) {
        throw new Error(
            "@microsoft/live-share-react: attempting to use `useFluidObjectsContext()` from a component that is not a child of `<LiveShareProvider>` or `<AzureProvider>`.\nTo fix this error, ensure that you are only using Live Share hooks (e.g., `useLiveState`) from a child component of `<LiveShareProvider>` or `<AzureProvider>`."
        );
    }
    return context;
};

/**
 * Prop types for {@link AzureProvider} component.
 */
export interface IAzureProviderProps {
    /**
     * Optional. React children node for the React Context Provider.
     */
    children?: React.ReactNode;
    /**
     * Props for initializing a new `AzureClient` instance.
     */
    clientOptions: AzureClientProps;
    /**
     * The `containerId` to connect to when {@link joinOnLoad} is true.
     *
     * @remarks
     * If you pass in an `undefined` value when {@link createOnLoad} is true, a new container will be created.
     */
    containerId?: string;
    /**
     * Flag to control whether or not a new container should be created on first mount.
     *
     * @remarks
     * If no {@link containerId} is set when the component first mounts, setting this to `true` will automatically create a new container.
     * This prop does not do anything if you are using `<LiveShareProvider>` instead of `<AzureProvider>`.
     */
    createOnLoad?: boolean;
    /**
     * The initial object schema to use when {@link joinOnLoad} or {@link createOnLoad} is true.
     */
    initialObjects?: LoadableObjectClassRecord;
    /**
     * Flag to control whether or not to connect to an existing container on first mount.
     *
     * @remarks
     * Setting this to true will connect to the container if {@link containerId} is provided as a prop.
     */
    joinOnLoad?: boolean;
}

/**
 * React Context provider component for using Fluid data objects & joining/creating a Fluid document `AzureClient`.
 */
export const AzureProvider: React.FC<IAzureProviderProps> = (props) => {
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
        async (
            containerId: string,
            initialObjects?: LoadableObjectClassRecord
        ): Promise<IAzureContainerResults> => {
            return new Promise(async (resolve, reject) => {
                try {
                    const results: IAzureContainerResults =
                        await clientRef.current.getContainer(
                            containerId,
                            initialObjects
                        );
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
            initialObjects?: LoadableObjectClassRecord,
            onInitializeContainer?: (container: IFluidContainer) => void
        ): Promise<IAzureContainerResults> => {
            return new Promise(async (resolve, reject) => {
                try {
                    const results: IAzureContainerResults =
                        await clientRef.current.createContainer(initialObjects);
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
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // We are not doing this here for backwards compatibility. View the README for more information.
        if (
            results?.container?.connectionState !== undefined ||
            startedRef.current
        )
            return;
        startedRef.current = true;
        if (props.containerId && props.joinOnLoad) {
            getContainer(props.containerId, props.initialObjects);
        } else if (!props.containerId && props.createOnLoad) {
            createContainer(props.initialObjects);
        }
    }, [
        results?.container?.connectionState,
        props.containerId,
        props.createOnLoad,
        props.joinOnLoad,
        props.initialObjects,
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

function isFluidObjectsContext(value: any): value is IFluidContext {
    return !!value?.clientRef;
}
