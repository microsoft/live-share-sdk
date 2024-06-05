/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ContainerSchema, IFluidContainer } from "fluid-framework";
import React from "react";
import { useSharedStateRegistry } from "../shared-hooks";
import {
    ILiveShareClientOptions,
    ILiveShareHost,
    ILiveShareJoinResults,
    ITimestampProvider,
    LiveShareClient,
} from "@microsoft/live-share";
import { FluidContext, useFluidObjectsContext } from "./AzureProvider";
import { isITeamsJsSdkError } from "../internal";

/**
 * React Context provider values for `<LiveShareProvider>`.
 *
 * @remarks
 * To get the latest values, use the {@link useLiveShareContext} hook.
 * Use the {@link useFluidObjectsContext} hook for other relevant context values.
 */
export interface ILiveShareContext {
    /**
     * True if the local user created the Fluid container
     */
    created: boolean;
    /**
     * True if connected to the Live Share container
     */
    joined: boolean;
    /**
     * An error that will be defined if there was a problem joining the container, or undefined if not.
     */
    joinError: Error | undefined;
    /**
     * Live Share timestamp provider. Can be used to `.getTimestamp()` for a global clock value.
     * This reference timestamp value should be fairly consistent for all users in the session.
     */
    timestampProvider: ITimestampProvider | undefined;
    /**
     * Join callback method for manually connecting to the Fluid container.
     *
     * @remarks
     * Use this callback if `joinOnLoad` is `false` or `undefined` in {@link ILiveShareProviderProps}.
     *
     * @param initialObjects Optional. The initial objects for the Fluid container schema.
     * @param onInitializeContainer Optional. Callback for when the container is first created.
     * @returns Promise with `ILiveShareJoinResults`, which includes the Fluid container
     */
    join: (
        fluidContainerSchema?: ContainerSchema,
        onInitializeContainer?: (container: IFluidContainer) => void
    ) => Promise<ILiveShareJoinResults>;
}

/**
 * @hidden
 */
export const LiveShareContext = React.createContext<ILiveShareContext>(
    {} as ILiveShareContext
);

/**
 * Hook to get the latest React context state for `LiveShareContext`.
 *
 * @remarks
 * This hook can only be used in a child component of `<LiveShareProvider>`.
 * See `useFluidObjectsContext` for other information related to the Live Share session, such as the `container`.
 *
 * @returns current state of `LiveShareContext`
 */
export const useLiveShareContext = (): ILiveShareContext => {
    const context = React.useContext(LiveShareContext);
    if (!isLiveShareContext(context)) {
        throw new Error(
            "@microsoft/live-share-react: attempting to use `useLiveShareContext()` from a component that is not a child of `<LiveShareProvider>`.\nTo fix this error, ensure that you are only using Live Share hooks (e.g., `useLiveState`) from a child component of `<LiveShareProvider>`."
        );
    }
    return context;
};

/**
 * Prop types for {@link LiveShareProvider} component.
 */
export interface ILiveShareProviderProps {
    /**
     * Optional. React children node for the React Context Provider
     */
    children?: React.ReactNode;
    /**
     * Optional. Options for initializing `LiveShareClient`.
     */
    clientOptions?: ILiveShareClientOptions;
    /**
     * Host to initialize `LiveShareClient` with.
     *
     * @remarks
     * If using the `LiveShareClient` class from `@microsoft/teams-js`, you must ensure that you have first called `teamsJs.app.initialize()` before calling `LiveShareClient.create()`.
     */
    host: ILiveShareHost;
    /**
     * The schema to use when {@link joinOnLoad} is true.
     */
    fluidContainerSchema?: ContainerSchema;
    /**
     * Optional. Flag to determine whether to join Fluid container on load.
     */
    joinOnLoad?: boolean;
}

/**
 * React Context provider component for using Live Share data objects & joining a Live Share session using `LiveShareClient`.
 */
export const LiveShareProvider: React.FC<ILiveShareProviderProps> = (props) => {
    const startedRef = React.useRef(false);
    const clientRef = React.useRef(
        new LiveShareClient(props.host, props.clientOptions)
    );
    const [results, setResults] = React.useState<
        ILiveShareJoinResults | undefined
    >();
    const [joinError, setJoinError] = React.useState<Error | undefined>();

    const stateRegistryCallbacks = useSharedStateRegistry(results);

    /**
     * Join container callback for joining the Live Share session
     */
    const join = React.useCallback(
        async (
            fluidContainerSchema?: ContainerSchema,
            onInitializeContainer?: (container: IFluidContainer) => void
        ): Promise<ILiveShareJoinResults> => {
            startedRef.current = true;
            const results = await clientRef.current.joinContainer(
                fluidContainerSchema,
                onInitializeContainer
            );
            setResults(results);
            return results;
        },
        []
    );

    /**
     * Joins the container on load if `props.joinOnLoad` is true
     */
    React.useEffect(() => {
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // We are not doing this here for backwards compatibility. View the README for more information.
        if (results !== undefined || startedRef.current || !props.joinOnLoad)
            return;
        join(props.fluidContainerSchema).catch((error) => {
            console.error(error);
            if (error instanceof Error) {
                setJoinError(error);
            } else if (isITeamsJsSdkError(error)) {
                setJoinError(
                    new Error(
                        `[${error.errorCode}] ${
                            error.message ??
                            "An unknown error occurred while joining container."
                        }`
                    )
                );
            } else if (typeof error == "string") {
                setJoinError(new Error(error));
            } else {
                setJoinError(
                    new Error(
                        "LiveShareProvider: An unknown error occurred while joining container."
                    )
                );
            }
        });
    }, [results, props.joinOnLoad, props.fluidContainerSchema, join]);

    return (
        <LiveShareContext.Provider
            value={{
                created: !!results?.created,
                timestampProvider: results?.timestampProvider,
                joined: !!results?.container,
                joinError,
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
                            "Cannot join new container through getContainer in LiveShareProvider"
                        );
                    },
                    createContainer: async () => {
                        throw new Error(
                            "Cannot create new container through createContainer in LiveShareProvider"
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

function isLiveShareContext(value: any): value is ILiveShareContext {
    return (
        typeof value?.created === "boolean" && typeof value?.join === "function"
    );
}
