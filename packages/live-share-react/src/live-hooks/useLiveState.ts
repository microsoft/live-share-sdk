/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveState, UserMeetingRole } from "@microsoft/live-share";
import React from "react";
import { SetLiveStateAction } from "../types";
import { useDynamicDDS } from "../shared-hooks";
import { useFluidObjectsContext } from "../providers";
import {
    ActionContainerNotJoinedError,
    ActionLiveDataObjectInitializedError,
    ActionLiveDataObjectUndefinedError,
    isPrevStateCallback,
} from "../internal";

/**
 * React hook for using a Live Share `LiveState`.
 *
 * @remarks
 * Use this hook if you want to synchronize app state that will reset when all users leave the session.
 *
 * @param uniqueKey the unique key for the `LiveEvent`. If one does not yet exist, a new one will be created, otherwise it will use the existing one.
 * @param initialState Optional. the initial state value of type TState
 * @param allowedRoles Optional. the user roles that are allowed to mutate the synchronized state
 * @returns ordered values: first value is the synchronized state value and the second is a setter to change the state value.
 * The setter returns a void promise, which will throw if the user does not have the required roles to set.
 */
export function useLiveState<TState = any>(
    uniqueKey: string,
    initialState: TState,
    allowedRoles?: UserMeetingRole[]
): [TState, SetLiveStateAction<TState>, LiveState<TState> | undefined] {
    const [currentState, setCurrentState] =
        React.useState<TState>(initialState);
    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveState } = useDynamicDDS<LiveState<TState>>(
        uniqueKey,
        LiveState<TState>
    );

    const { container } = useFluidObjectsContext();

    /**
     * Change state callback that is user facing
     * @param state TState to set
     * @returns void promise, which will throw if the user does not have the required roles
     */
    const setState = React.useCallback(
        async (state: TState | ((prevState: TState) => TState)) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "liveState",
                    "setState"
                );
            }
            if (liveState === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "liveState",
                    "setState"
                );
            }
            if (!liveState.isInitialized) {
                throw new ActionLiveDataObjectInitializedError(
                    "liveState",
                    "setState"
                );
            }
            const valueToSet = isPrevStateCallback<TState>(state)
                ? state(liveState.state)
                : state;
            return await liveState.set(valueToSet);
        },
        [container, liveState]
    );

    /**
     * Setup change listeners and start `LiveState` if needed
     */
    React.useEffect(() => {
        if (liveState === undefined) return;

        const onStateChanged = (state: TState) => {
            setCurrentState(state);
        };
        liveState.on("stateChanged", onStateChanged);
        if (!liveState.isInitialized) {
            liveState.initialize(initialState, allowedRoles);
        }
        if (JSON.stringify(liveState.state) !== JSON.stringify(initialState)) {
            onStateChanged(liveState.state);
        }

        return () => {
            liveState?.off("stateChanged", onStateChanged);
        };
    }, [liveState]);

    return [currentState, setState, liveState];
}
