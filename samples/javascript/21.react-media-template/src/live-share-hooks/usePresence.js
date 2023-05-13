/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    LivePresence,
    UserMeetingRole,
    ITimestampProvider,
    PresenceState,
} from "@microsoft/live-share";
import { useState, useEffect, useRef, useMemo } from "react";
import { app } from "@microsoft/teams-js";

/**
 * Hook for tracking users, roles, and who is in control
 *
 * @remarks
 *
 * @param {LivePresence} presence presence object from Fluid container.
 * @param {UserMeetingRole[]} acceptPlaybackChangesFrom List of acceptable roles for playback transport commands.
 * @param {app.Context} context Teams context object
 * @param {ITimestampProvider} timestampProvider The Live Share timestamp provider, used to get a server timestamp value for sorting
 * @returns `{started, localUser, users, presentingUser, localUserIsEligiblePresenter, localUserIsPresenting, takeControl}` where:
 * - `presenceStarted` is a boolean indicating whether `presence.initialize()` has been called.
 * - `localUser` is the local user's presence object.
 * - `users` is an array of user presence objects in the session.
 * - `localUserIsEligiblePresenter` is a boolean indicating whether the local user is an eligible presenter.
 */
export const usePresence = (
    presence,
    acceptPlaybackChangesFrom,
    context,
    timestampProvider
) => {
    const startedInitializingRef = useRef(false);
    const usersRef = useRef([]);
    const [users, setUsers] = useState(usersRef.current);
    const [localUser, setLocalUser] = useState();
    const [presenceStarted, setStarted] = useState(false);

    // Local user is an eligible presenter
    const localUserIsEligiblePresenter = useMemo(() => {
        if (acceptPlaybackChangesFrom.length === 0) {
            return true;
        }
        if (!presence || !localUser) {
            return false;
        }
        return (
            localUser.roles.filter((role) =>
                acceptPlaybackChangesFrom.includes(role)
            ).length > 0
        );
    }, [acceptPlaybackChangesFrom, presence, localUser]);

    // Effect which registers SharedPresence event listeners before joining space
    useEffect(() => {
        if (
            !presence ||
            presence.isInitialized ||
            !context ||
            startedInitializingRef.current
        )
            return;
        startedInitializingRef.current = true;
        // Register presenceChanged event listener
        presence.on("presenceChanged", (userPresence, local) => {
            console.log("usePresence: presence received", userPresence, local);
            if (local) {
                setLocalUser(userPresence);
            }
            // Set users local state
            const userArray = presence.getUsers(PresenceState.online);
            // Need to create new array so that React knows the user list changed.
            setUsers([...userArray]);
        });
        const userData = {
            joinedTimestamp: timestampProvider?.getTimestamp(),
        };

        presence
            .initialize(userData)
            .then(() => {
                console.log("usePresence: started presence");
                setStarted(true);
            })
            .catch((error) => console.error(error));
    }, [presence, context, timestampProvider, setUsers, setLocalUser]);

    return {
        presenceStarted,
        localUser,
        users,
        localUserIsEligiblePresenter,
    };
};
