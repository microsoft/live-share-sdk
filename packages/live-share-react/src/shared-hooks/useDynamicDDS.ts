/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import React from "react";
import { FluidObject, IFluidLoadable } from "@fluidframework/core-interfaces";
import { useFluidObjectsContext } from "../providers";
import { LoadableObjectClass } from "@microsoft/live-share";

/**
 * Hook to gets or creates a DDS that corresponds to a given uniqueKey string.
 *
 * @remarks
 * This hook can only be used in a child component of `<LiveShareProvider>` or `<AzureProvider>`.
 *
 * @template T Type of Fluid LoadableObjectClass type to load. Must conform to IFluidLoadable interface.
 * @param uniqueKey uniqueKey value for the data object
 * @param loadableObjectClass Fluid LoadableObjectClass<T> to create/load.
 * @param onFirstInitialize Optional. Callback function for when the DDS is first loaded
 * @returns the DDS object, which is of type T when loaded and undefined while loading
 */
export function useDynamicDDS<
    T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
>(
    uniqueKey: string,
    loadableObjectClass: LoadableObjectClass<T>,
    onFirstInitialize?: (dds: T) => void
): {
    dds: T | undefined;
    error: Error | undefined;
} {
    const [dds, setDDS] = React.useState<T>();
    const [error, setError] = React.useState<Error>();
    /**
     * Import container and DDS object register callbacks from AzureProvider.
     */
    const { container, clientRef } = useFluidObjectsContext();

    /**
     * Once container is available, this effect will register the setter method so that the DDS loaded
     * from `dynamicObjects` that matches `uniqueKey` can be passed back to this hook. If one does not yet exist,
     * a new DDS is automatically created. If multiple users try to create a DDS at the same time when this component first
     * mounts, `live-share-turbo` ensures it will ultimately self correct using last-writer wins.
     */
    React.useEffect(() => {
        if (container === undefined) return;
        let mounted = true;
        // Callback method to set the `initialData` into the map when the DDS is first created.
        const onGetDDS = async () => {
            try {
                const dds = await clientRef.current.getDDS<T>(
                    uniqueKey,
                    loadableObjectClass,
                    onFirstInitialize
                );
                if (mounted) {
                    setDDS(dds);
                }
            } catch (error: unknown) {
                if (error instanceof Error) {
                    setError(error);
                } else {
                    setError(
                        new Error(
                            "useDynamicDDS: an unknown error occurred while getting the DDS"
                        )
                    );
                }
            }
        };
        onGetDDS();
        return () => {
            mounted = false;
        };
    }, [container, uniqueKey, onFirstInitialize]);

    return {
        dds,
        error,
    };
}
