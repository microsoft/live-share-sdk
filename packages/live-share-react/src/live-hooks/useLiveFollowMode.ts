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
    LiveFollowMode,
    IFollowModePresenceUserData,
    IFollowModeState,
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
 * React hook for using a Live Share `LiveFollowMode`.
 */
export function useLiveFollowMode<TData = any>(
    uniqueKey: string,
    initialData: TData | (() => TData),
    allowedRoles?: UserMeetingRole[]
) {
    /**
     * Stateful follow state.
     */
    const [state, setState] = React.useState<IFollowModeState<TData>>();
    /**
     * Stateful all user presence list and its non-user-facing setter method.
     */
    const [allUsers, setAllUsers] = React.useState<
        LivePresenceUser<IFollowModePresenceUserData<TData>>[]
    >([]);
    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveFollowMode } = useDynamicDDS<LiveFollowMode<TData>>(
        uniqueKey,
        LiveFollowMode<TData>
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
     * User facing: callback to update the local user's custom data for their follow state.
     */
    const update = React.useCallback(
        async (stateValue: TData) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "liveFollowMode",
                    "updateState"
                );
            }
            if (liveFollowMode === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "liveFollowMode",
                    "updateState"
                );
            }
            if (!liveFollowMode.isInitialized) {
                throw new ActionLiveDataObjectInitializedError(
                    "liveFollowMode",
                    "updateState"
                );
            }
            return await liveFollowMode.update(stateValue);
        },
        [container, liveFollowMode]
    );

    /**
     * User facing: callback to start presenting.
     */
    const startPresenting = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError(
                "liveFollowMode",
                "updateState"
            );
        }
        if (liveFollowMode === undefined) {
            throw new ActionLiveDataObjectUndefinedError(
                "liveFollowMode",
                "updateState"
            );
        }
        if (!liveFollowMode.isInitialized) {
            throw new ActionLiveDataObjectInitializedError(
                "liveFollowMode",
                "updateState"
            );
        }
        return await liveFollowMode.startPresenting();
    }, [container, liveFollowMode]);

    /**
     * User facing: callback to stop presenting.
     */
    const stopPresenting = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError(
                "liveFollowMode",
                "stopPresenting"
            );
        }
        if (liveFollowMode === undefined) {
            throw new ActionLiveDataObjectUndefinedError(
                "liveFollowMode",
                "stopPresenting"
            );
        }
        if (!liveFollowMode.isInitialized) {
            throw new ActionLiveDataObjectInitializedError(
                "liveFollowMode",
                "stopPresenting"
            );
        }
        return await liveFollowMode.stopPresenting();
    }, [container, liveFollowMode]);

    /**
     * User facing: callback to suspend sync.
     */
    const beginSuspension = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError(
                "liveFollowMode",
                "syncToPresenter"
            );
        }
        if (liveFollowMode === undefined) {
            throw new ActionLiveDataObjectUndefinedError(
                "liveFollowMode",
                "syncToPresenter"
            );
        }
        if (!liveFollowMode.isInitialized) {
            throw new ActionLiveDataObjectInitializedError(
                "liveFollowMode",
                "syncToPresenter"
            );
        }
        return await liveFollowMode.beginSuspension();
    }, [container, liveFollowMode]);

    /**
     * User facing: callback to end current suspension.
     */
    const endSuspension = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError(
                "liveFollowMode",
                "syncToPresenter"
            );
        }
        if (liveFollowMode === undefined) {
            throw new ActionLiveDataObjectUndefinedError(
                "liveFollowMode",
                "syncToPresenter"
            );
        }
        if (!liveFollowMode.isInitialized) {
            throw new ActionLiveDataObjectInitializedError(
                "liveFollowMode",
                "syncToPresenter"
            );
        }
        return await liveFollowMode.endSuspension();
    }, [container, liveFollowMode]);

    /**
     * User facing: callback to follow a specific user.
     */
    const followUser = React.useCallback(
        async (userId: string) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "liveFollowMode",
                    "followUser"
                );
            }
            if (liveFollowMode === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "liveFollowMode",
                    "followUser"
                );
            }
            if (!liveFollowMode.isInitialized) {
                throw new ActionLiveDataObjectInitializedError(
                    "liveFollowMode",
                    "followUser"
                );
            }
            return await liveFollowMode.followUser(userId);
        },
        [container, liveFollowMode]
    );

    /**
     * User facing: callback to stop following a user.
     */
    const stopFollowing = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError(
                "liveFollowMode",
                "stopFollowing"
            );
        }
        if (liveFollowMode === undefined) {
            throw new ActionLiveDataObjectUndefinedError(
                "liveFollowMode",
                "stopFollowing"
            );
        }
        if (!liveFollowMode.isInitialized) {
            throw new ActionLiveDataObjectInitializedError(
                "liveFollowMode",
                "stopFollowing"
            );
        }
        return await liveFollowMode.stopFollowing();
    }, [container, liveFollowMode]);

    /**
     * Setup change listeners and start `LiveFollowMode` if needed
     */
    React.useEffect(() => {
        if (liveFollowMode === undefined) return;

        const onPresenceChanged = () => {
            const updatedLocalUsers: LivePresenceUser<
                IFollowModePresenceUserData<TData>
            >[] = [];
            liveFollowMode?.getUsers().forEach((user) => {
                updatedLocalUsers.push(user);
            });
            setAllUsers(updatedLocalUsers);
        };
        liveFollowMode.on("presenceChanged", onPresenceChanged);
        const onStateChanged = () => {
            setState(liveFollowMode?.state);
        };
        liveFollowMode.on("stateChanged", onStateChanged);

        if (
            liveFollowMode.initializeState ===
            LiveDataObjectInitializeState.needed
        ) {
            liveFollowMode.initialize(
                isInitialDataCallback<TData>(initialData)
                    ? initialData()
                    : initialData,
                allowedRoles
            );
        } else {
            onPresenceChanged();
            onStateChanged();
        }

        return () => {
            liveFollowMode?.off("presenceChanged", onPresenceChanged);
            liveFollowMode?.off("stateChanged", onStateChanged);
        };
    }, [liveFollowMode]);

    return {
        state,
        localUser,
        otherUsers,
        allUsers,
        liveFollowMode,
        update,
        startPresenting,
        stopPresenting,
        beginSuspension,
        endSuspension,
        followUser,
        stopFollowing,
    };
}

function isInitialDataCallback<TData>(value: any): value is () => TData {
    return typeof value === "function";
}
