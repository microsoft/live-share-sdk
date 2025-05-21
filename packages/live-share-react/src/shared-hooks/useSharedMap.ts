/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import React from "react";
import { isEntries, isJSON, isMap } from "../utils/index.js";
import { IUseSharedMapResults, SharedMapInitialData } from "../types/index.js";
import { useDynamicDDS } from "./useDynamicDDS.js";
import { SharedMap } from "fluid-framework/legacy";
import {
    ActionContainerNotJoinedError,
    ActionLiveDataObjectUndefinedError,
} from "../internal/errors.js";
import { useFluidObjectsContext } from "../providers/AzureProvider.js";
import { useSharedTree } from "./useSharedTree.js";

/**
 * @deprecated use {@link useSharedTree} instead.
 *
 * React hook for using a Fluid `SharedMap`.
 *
 * @remarks
 * The primary benefit of using the `useSharedMap` hook rather than the Fluid `SharedMap`
 * directly is that it integrates nicely with React state and automates repetitive tasks.
 * If you want to use `SharedMap` this hook creates directly, you can do that as well.
 * This hook can only be used in a child component of `<LiveShareProvider>` or `<AzureProvider>`.
 *
 * @template TData Optional typing for objects stored in the SharedMap. Default is `any` type.
 * @param uniqueKey the unique key for the `SharedMap`. If one does not yet exist, a new `SharedMap`
 * will be created, otherwise it will use the existing one.
 * @param initialData a JS Map, entries array, or JSON object to insert into the `SharedMap` when creating
 * the DDS for the first time.
 * @returns the Fluid `sharedMap`.
 */
export function useSharedMap<TData = any>(
    uniqueKey: string,
    initialData?: SharedMapInitialData<TData>
): IUseSharedMapResults<TData> {
    const onFirstInitialize = React.useCallback(
        (newDDS: SharedMap): void => {
            /**
             * Callback method to set the `initialData` into the map when the `SharedMap` is first created.
             * Only should be used as a prop to useDynamicDDS.
             */
            getInitialData(initialData).forEach((value, key) => {
                newDDS.set(key, value);
            });
        },
        [initialData]
    );
    /**
     * User facing: dynamically load the SharedMap DDS for the given unique key.
     */
    const { dds: sharedMap } = useDynamicDDS<SharedMap>(
        uniqueKey,
        SharedMap,
        onFirstInitialize
    );

    const { container } = useFluidObjectsContext();

    /**
     * User facing: get a value from the Fluid `SharedMap`.
     */
    const getEntry = React.useCallback(
        (key: string) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "sharedMap",
                    "getEntry"
                );
            }
            if (sharedMap === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "sharedMap",
                    "getEntry"
                );
            }
            return sharedMap.get(key);
        },
        [container, sharedMap]
    );

    /**
     * User facing: set a value to the Fluid `SharedMap`.
     */
    const setEntry = React.useCallback(
        (key: string, value: TData) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "sharedMap",
                    "setEntry"
                );
            }
            if (sharedMap === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "sharedMap",
                    "setEntry"
                );
            }
            sharedMap.set(key, value);
        },
        [container, sharedMap]
    );

    /**
     * User facing: delete a value from the Fluid `SharedMap`.
     */
    const deleteEntry = React.useCallback(
        (key: string) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "sharedMap",
                    "deleteEntry"
                );
            }
            if (sharedMap === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "sharedMap",
                    "deleteEntry"
                );
            }
            sharedMap.delete(key);
        },
        [container, sharedMap]
    );

    const [sharedMapProxy, setSharedMapProxy] = React.useState<SharedMap>();

    // Setup change listeners, initial values, etc.
    React.useEffect(() => {
        if (!sharedMap) return;
        setSharedMapProxy(sharedMap);

        class SharedMapProxyHandler implements ProxyHandler<SharedMap> {}

        // Register valueChanged listener for `SharedMap`.
        const onValueChanged = () => {
            setSharedMapProxy(
                new Proxy(sharedMap, new SharedMapProxyHandler())
            );
        };
        sharedMap.on("valueChanged", onValueChanged);
        // Get initial values from `SharedMap`.
        onValueChanged();

        return () => {
            // Cleanup on component unmount.
            sharedMap?.off("valueChanged", onValueChanged);
        };
    }, [sharedMap]);

    return {
        sharedMap: sharedMapProxy,
        getEntry,
        setEntry,
        deleteEntry,
    };
}

/**
 * Helper method for converting different initial data props into a Map<string, TData> to insert into the Fluid SharedMap
 * @template TData Optional typing for objects stored in the SharedMap. Default is `object` type.
 * @param initialData a JS Map, entries array, or JSON object.
 * @returns A Map<string, TData> with the entries provided.
 */
function getInitialData<TData>(
    initialData: SharedMapInitialData<TData>
): Map<string, TData> {
    if (isMap(initialData)) {
        return initialData;
    } else if (isEntries(initialData)) {
        return new Map<string, TData>(initialData);
    } else if (isJSON(initialData)) {
        const values: (readonly [string, TData])[] = Object.keys(
            initialData
        ).map((key) => {
            return [key, initialData[key]];
        });
        return new Map<string, TData>(values);
    }
    return new Map<string, TData>();
}
