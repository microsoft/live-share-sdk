/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import React from "react";
import { useFluidObjectsContext } from "../providers";
import { DisposeSharedStateAction, SetSharedStateAction } from "../types";
import { v4 as uuid } from "uuid";
import { isPrevStateCallback } from "../internal";

/**
 * Inspired by React's `useState` hook, `useSharedState` makes it easy to synchronize state in your app.
 *
 * @remarks
 * Values set through this state is automatically attached to a `SharedMap` that the `AzureProvider`
 * creates. If you are synchronizing complex data structures that multiple users will be setting simultaneously,
 * consider using an optimized hook for your data structure (e.g., `useSharedMap`, `useSharedString`, etc.).
 *
 * @template S Typing for objects stored associated with the `uniqueKey`.
 * @param uniqueKey the unique key for a `SharedMap`. If you use the same key for multiple components, those components will reference the same state.
 * @param initialState a default state for the `SharedMap`.
 *
 * @returns a stateful value, the function to update it, and an optional dispose method to delete it from the `SharedMap`.
 */
export function useSharedState<S = any>(
    uniqueKey: string,
    initialState: S
): [S, SetSharedStateAction<S>, DisposeSharedStateAction] {
    /**
     * User facing: stateful value and non-user facing setter.
     */
    const [localState, setLocalState] = React.useState<S>(initialState);
    /**
     * Unique ID reference for the component.
     */
    const componentIdRef = React.useRef(uuid());
    /**
     * Register set state callbacks from AzureProvider and update/delete callbacks for initial object's `stateMap`.
     */
    const {
        registerSharedSetStateAction,
        unregisterSharedSetStateAction,
        updateSharedState,
        deleteSharedState,
    } = useFluidObjectsContext();

    /**
     * User facing: callback to change the shared state.
     */
    const setSharedState: SetSharedStateAction<S> = React.useCallback(
        (state: S | ((prevState: S) => S)) => {
            setLocalState((prevState) => {
                const valueToSet = isPrevStateCallback<S>(state)
                    ? state(prevState)
                    : state;
                updateSharedState(uniqueKey, valueToSet);
                return valueToSet;
            });
        },
        [uniqueKey, setLocalState, updateSharedState]
    );

    /**
     * User facing: callback to dispose the shared state from the `stateMap`.
     */
    const disposeSharedState: DisposeSharedStateAction =
        React.useCallback(() => {
            deleteSharedState(uniqueKey);
        }, [uniqueKey, deleteSharedState]);

    /**
     * Once container is available, this effect will register the setter method so that the `S` value
     * from `stateMap` that matches `uniqueKey` can be passed back to this hook whenever changed.
     *
     * @see registerSharedSetStateAction to see how new values from `stateMap` are passed to this hook.
     * @see unregisterSharedSetStateAction to see how this component stops listening to changes in the `stateMap`.
     */
    React.useEffect(() => {
        registerSharedSetStateAction(
            uniqueKey,
            componentIdRef.current,
            setLocalState
        );
        return () => {
            unregisterSharedSetStateAction(uniqueKey, componentIdRef.current);
        };
    }, [
        uniqueKey,
        registerSharedSetStateAction,
        unregisterSharedSetStateAction,
    ]);

    return [localState, setSharedState, disposeSharedState];
}
