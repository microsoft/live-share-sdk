/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    LivePresenceUser,
    PresenceState,
    LivePresence,
    UserMeetingRole,
    LiveDataObjectInitializeState,
} from "@microsoft/live-share";
import React from "react";
import { IUseLivePresenceResults, OnUpdateLivePresenceAction } from "../types";
import { useDynamicDDS } from "../shared-hooks";
import { useFluidObjectsContext } from "../providers";
import {
    ActionContainerNotJoinedError,
    ActionLiveDataObjectInitializedError,
    ActionLiveDataObjectUndefinedError,
} from "../internal";

/**
 * React hook for using a Live Share `LivePresence`.
 *
 * @remarks
 * Use this hook if you want to track presence for who is currently using this component, such as
 * who is online or who is viewing a specific document. With presence, you can sent along any custom
 * user data. This is useful for rendering a list of users, profile pictures, cursor positions, and more.
 *
 * @template TData Optional typing for the custom user presence data object. Default is `object` type.
 * @param uniqueKey The unique key for `LivePresence`. If one does not yet exist, a new one will be created.
 * @param initialData Optional. Initial presence data object for the user. Can be value or a function to get the value.
 * @param initialPresenceState Optional. Initial status of the user's presence. Default is online.
 * @param allowedRoles Optional. the user roles that are allowed to mutate the synchronized state
 * will be created, otherwise it will use the existing one. Default value is ":<dds-default>"
 * @returns stateful `localUser`, `otherUsers` list, and `allUsers` list. Also returns a callback method
 * to update the local user's presence and the `LivePresence` Fluid object.
 */
export function useLivePresence<TData extends object = object>(
    uniqueKey: string,
    initialData?: TData | (() => TData) | undefined,
    initialPresenceState: PresenceState = PresenceState.online,
    allowedRoles?: UserMeetingRole[]
): IUseLivePresenceResults<TData> {
    /**
     * Stateful all user presence list and its non-user-facing setter method.
     */
    const [allUsers, setAllUsers] = React.useState<LivePresenceUser<TData>[]>(
        []
    );
    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: livePresence } = useDynamicDDS<LivePresence<TData>>(
        uniqueKey,
        LivePresence<TData>
    );

    /**
     * User facing: list of non-local user's presence objects.
     */
    const otherUsers = allUsers.filter((user) => !user.isLocalUser);

    /**
     * User facing: local user's presence object.
     */
    const localUser = allUsers.find((user) => user.isLocalUser);

    const { container } = useFluidObjectsContext();

    /**
     * User facing: callback to update the local user's presence.
     */
    const updatePresence: OnUpdateLivePresenceAction<TData> = React.useCallback(
        async (data?: TData | undefined, state?: PresenceState | undefined) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "livePresence",
                    "updatePresence"
                );
            }
            if (livePresence === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "livePresence",
                    "updatePresence"
                );
            }
            if (!livePresence.isInitialized) {
                throw new ActionLiveDataObjectInitializedError(
                    "livePresence",
                    "updatePresence"
                );
            }
            return await livePresence.update(data, state);
        },
        [container, livePresence]
    );

    /**
     * Setup change listeners and start `LivePresence` if needed
     */
    React.useEffect(() => {
        if (livePresence === undefined) return;

        const onPresenceChanged = () => {
            const updatedLocalUsers: LivePresenceUser<TData>[] = [];
            livePresence?.getUsers().forEach((user) => {
                updatedLocalUsers.push(user);
            });
            setAllUsers(updatedLocalUsers);
        };
        livePresence.on("presenceChanged", onPresenceChanged);

        if (
            livePresence.initializeState ===
            LiveDataObjectInitializeState.needed
        ) {
            livePresence.initialize(
                isInitialDataCallback<TData>(initialData)
                    ? initialData()
                    : initialData,
                initialPresenceState,
                allowedRoles
            );
        } else {
            onPresenceChanged();
        }

        return () => {
            livePresence?.off("presenceChanged", onPresenceChanged);
        };
    }, [livePresence]);

    return {
        localUser,
        otherUsers,
        allUsers,
        livePresence,
        updatePresence,
    };
}

function isInitialDataCallback<TData>(value: any): value is () => TData {
    return typeof value === "function";
}
