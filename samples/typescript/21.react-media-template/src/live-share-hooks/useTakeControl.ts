import { useCallback, useEffect, useMemo, useState } from "react";
import { ITimestampProvider, LivePresenceUser } from "@microsoft/live-share";
import { SharedMap } from "fluid-framework";
import { IUserData } from "./usePresence";

export const useTakeControl = (
    localUserIsEligiblePresenter: boolean,
    users: LivePresenceUser<IUserData>[],
    takeControlMap?: SharedMap,
    localUserId?: string,
    timestampProvider?: ITimestampProvider,
    sendNotification?: (text: string) => void
) => {
    const [history, setHistory] = useState(new Map<string, number>());
    const [takeControlStarted, setStarted] = useState(false);

    // Computed presentingUser object based on most recent online user to take control
    const presentingUser = useMemo(() => {
        const mappedUsers = users.map((user) => {
            return {
                userId: user.userId,
                state: user.state,
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
        const values = new Map<string, number>();
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
