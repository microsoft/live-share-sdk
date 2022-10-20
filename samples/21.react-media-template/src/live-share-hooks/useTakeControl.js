import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveEvent } from "@microsoft/live-share";
// eslint-disable-next-line
import { SharedMap } from "fluid-framework";

/**
 * @param {SharedMap} takeControlMap shared map
 * @param {string} localUserId local user ID
 * @param {boolean} localUserIsEligiblePresenter boolean that is true when local user is eligible presenter
 * @param {any[]} users user presence array
 * @param {string[]} acceptPlaybackChangesFrom accepted roles for playback control
 * @param {(text: string) => void} sendNotification Send notification callback from `useNotification` hook.
 * @returns `{takeControlStarted, presentingUser, localUserIsPresenting, takeControl}` where:
 * - `takeControlStarted` is a boolean indicating whether mediaSession.initialize() has been called.
 * - `presentingUser` is a callback method to play through the synchronizer.
 * - `localUserIsPresenting` is a callback method to pause through the synchronizer.
 * - `takeControl` is a callback method to seek a video to a given timestamp (in seconds).
 */
export const useTakeControl = (
    takeControlMap,
    localUserId,
    localUserIsEligiblePresenter,
    users,
    sendNotification
) => {
    const [history, setHistory] = useState({});
    const [takeControlStarted, setStarted] = useState(false);

    // Computed presentingUser object based on most recent online user to take control
    const presentingUser = useMemo(() => {
        const onlineUsers = users.filter((user) => {
            return user.state === "online";
        });
        if (onlineUsers.length === 0) {
            return null;
        }
        const mappedOnlineUsers = onlineUsers.map((user) => ({
            userId: user.userId,
            state: user.state,
            data: user.data,
            lastInControlTimestamp: history[user.data?.teamsUserId] || 0,
        }));
        mappedOnlineUsers.sort((a, b) => {
            // Sort by joined timestamp in descending
            if (a.lastInControlTimestamp === b.lastInControlTimestamp) {
                return a.data?.joinedTimestamp - b.data?.joinedTimestamp;
            }
            // Sort by last in control time in ascending
            return b.lastInControlTimestamp - a.lastInControlTimestamp;
        });
        return mappedOnlineUsers[0];
    }, [history, users]);

    // Local user is the presenter
    const localUserIsPresenting = useMemo(() => {
        if (!presentingUser || !localUserId) {
            return false;
        }
        return localUserId === presentingUser?.data?.teamsUserId;
    }, [localUserId, presentingUser]);

    // Set the local user ID
    const takeControl = useCallback(() => {
        if (!!localUserId && localUserIsEligiblePresenter) {
            takeControlMap?.set(localUserId, LiveEvent.getTimestamp());
            if (sendNotification) {
                sendNotification("took control");
            }
        }
    }, [
        takeControlMap,
        localUserId,
        localUserIsEligiblePresenter,
        sendNotification,
    ]);

    // Refresh local state with latest values from takeControlMap
    const refreshControlMap = useCallback(() => {
        const values = {};
        takeControlMap.forEach((value, key) => {
            values[key] = value;
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
