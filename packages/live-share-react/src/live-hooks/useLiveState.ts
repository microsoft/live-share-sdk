/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveState, UserMeetingRole } from "@microsoft/live-share";
import React from "react";
import { SetLiveStateAction } from "../types";
import { useDynamicDDS } from "../shared-hooks";
import { useFluidObjectsContext } from "../providers";

interface ILiveStateStatus<
    TState extends string = string,
    TData extends object = object
> {
    state?: TState;
    data?: TData;
}

/**
 * React hook for using a Live Share `LiveState`.
 *
 * @remarks
 * Use this hook if you want to synchronize app state that will reset when all users leave the session.
 *
 * @param uniqueKey the unique key for the `LiveEvent`. If one does not yet exist, a new one will be created, otherwise it will use the existing one.
 * @param allowedRoles Optional. the user roles that are allowed to mutate the synchronized state
 * @param initialState Optional. the initial state value of type TState
 * @param initialData Optional. the initial data value of type TData
 * @returns ordered values: first value is the synchronized state value, second is synchronized data value, and third is a setter to change the state/data values.
 */
export function useLiveState<
    TState extends string = string,
    TData extends object = object
>(
    uniqueKey: string,
    allowedRoles?: UserMeetingRole[],
    initialState?: TState,
    initialData?: TData
): [TState | undefined, TData | undefined, SetLiveStateAction<TState, TData>] {
    const listeningRef = React.useRef(false);
    const [current, setCurrent] = React.useState<
        ILiveStateStatus<TState, TData>
    >({
        state: initialState,
        data: initialData,
    });

    const { clientRef } = useFluidObjectsContext();

    const getDDS = React.useCallback((): Promise<LiveState<TData>> => {
        return clientRef.current.getDDS<LiveState<TData>>(uniqueKey, LiveState<TData>);
    }, [uniqueKey]);
    /**
     * User facing: dynamically load the LiveState DDS for the given unique key.
     */
    const { dds: liveState } = useDynamicDDS<LiveState<TData>>(getDDS);

    /**
     * Change state callback that is user facing
     */
    const changeState = React.useCallback(
        (state: TState, value?: TData | undefined) => {
            if (!liveState) {
                console.error(
                    new Error(
                        "Cannot call changeState when liveState is undefined"
                    )
                );
                return;
            }
            if (!liveState.isInitialized) {
                console.error(
                    new Error(
                        "Cannot call changeState while liveState is not started"
                    )
                );
                return;
            }
            liveState?.changeState(state, value);
        },
        [liveState]
    );

    /**
     * Setup change listeners and start `LiveState` if needed
     */
    React.useEffect(() => {
        if (listeningRef.current || liveState?.isInitialized === undefined)
            return;
        listeningRef.current = true;

        const onStateChanged = (state: TState, data: TData | undefined) => {
            setCurrent({
                state,
                data,
            });
        };
        liveState.on("stateChanged", onStateChanged);
        if (!liveState.isInitialized) {
            liveState.initialize(allowedRoles, initialState, initialData);
            if (liveState.state) {
                onStateChanged(liveState.state as TState, liveState.data);
            }
        } else if (liveState.state) {
            onStateChanged(liveState.state as TState, liveState.data);
        }

        return () => {
            listeningRef.current = false;
            liveState?.off("stateChanged", onStateChanged);
        };
    }, [liveState?.isInitialized]);

    return [current?.state, current?.data, changeState];
}
