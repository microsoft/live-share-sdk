import { useCallback, useEffect, useMemo, useState } from "react";
import { ITimestampProvider } from "@microsoft/live-share";
import { SharedMap } from "fluid-framework/legacy";

/**
 * @param {boolean} localUserIsEligiblePresenter boolean that is true when local user is eligible presenter
 * @param {any[]} users user presence array
 * @param {SharedMap} takeControlMap shared map
 * @param {string} localUserId local user ID
 * @param {ITimestampProvider} timestampProvider timestamp provider, used for getting things like server timestamp
 * @param {(text: string) => void} sendNotification Send notification callback from `useNotification` hook.
 * @returns `{takeControlStarted, presentingUser, localUserIsPresenting, takeControl}` where:
 * - `takeControlStarted` is a boolean indicating whether mediaSession.initialize() has been called.
 * - `presentingUser` is a callback method to play through the synchronizer.
 * - `localUserIsPresenting` is a callback method to pause through the synchronizer.
 * - `takeControl` is a callback method to seek a video to a given timestamp (in seconds).
 */
export const useTakeControl = (
    localUserIsEligiblePresenter,
    users,
    takeControlMap,
    localUserId,
    timestampProvider,
    sendNotification
) => {
    const [history, setHistory] = useState(new Map());
    const [takeControlStarted, setStarted] = useState(false);

    // Computed presentingUser object based on most recent online user to take control
    const presentingUser = useMemo(() => {
        const mappedUsers = users.map((user) => {
            return {
                userId: user.userId,
                state: user.status,
                data: user.data,
                lastInControlTimestamp: user.userId
                    ? history.get(user.userId)
                    : 0,
            };
        });
        mappedUsers.sort((a, b) => {
            // Sort by joined timestamp in descending
            if (a.lastInControlTimestamp === b.lastInControlTimestamp) {
                return (
                    (a.data?.joinedTimestamp ?? 0) -
                    (b.data?.joinedTimestamp ?? 0)
                );
            }
            // Sort by last in control time in ascending
            return (
                (b.lastInControlTimestamp ?? 0) -
                (a.lastInControlTimestamp ?? 0)
            );
        });
        return mappedUsers[0];
    }, [history, users]);

    // Local user is the presenter
    const localUserIsPresenting = useMemo(() => {
        if (!presentingUser || !localUserId) {
            return false;
        }
        return localUserId === presentingUser.userId;
    }, [localUserId, presentingUser]);

    // Set the local user ID
    const takeControl = useCallback(() => {
        if (!!localUserId && localUserIsEligiblePresenter) {
            takeControlMap?.set(localUserId, timestampProvider?.getTimestamp());
            if (sendNotification) {
                sendNotification("took control");
            }
        }
    }, [
        takeControlMap,
        localUserId,
        localUserIsEligiblePresenter,
        timestampProvider,
        sendNotification,
    ]);

    // Refresh local state with latest values from takeControlMap
    const refreshControlMap = useCallback(() => {
        const values = new Map();
        takeControlMap?.forEach((value, key) => {
            values.set(key, value);
        });
        setHistory(values);
    }, [takeControlMap, setHistory]);

    // Hook to register event listener for takeControlMap
    useEffect(() => {
        if (takeControlMap && !takeControlStarted && localUserId) {
            takeControlMap.on("valueChanged", refreshControlMap);
            refreshControlMap();
            console.log("useTakeControl: started take control");
            setStarted(true);
        }
    }, [
        takeControlMap,
        localUserId,
        takeControlStarted,
        refreshControlMap,
        setStarted,
    ]);

    return {
        takeControlStarted,
        presentingUser,
        localUserIsPresenting,
        takeControl,
    };
};
