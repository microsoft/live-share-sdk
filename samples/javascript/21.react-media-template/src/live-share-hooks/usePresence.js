/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { LiveShareClient } from "@microsoft/live-share";
import { useState, useEffect, useRef, useMemo } from "react";

/**
 * Hook for tracking users, roles, and who is in control
 *
 * @remarks
 *
 * @param {LivePresence} presence presence object from Fluid container.
 * @param {UserMeetingRole[]} acceptPlaybackChangesFrom List of acceptable roles for playback transport commands.
 * @param {microsoftTeams.app.Context} context Teams context object
 * @returns `{started, localUser, users, presentingUser, localUserIsEligiblePresenter, localUserIsPresenting, takeControl}` where:
 * - `presenceStarted` is a boolean indicating whether `presence.initialize()` has been called.
 * - `localUser` is the local user's presence object.
 * - `users` is an array of user presence objects in the session.
 * - `localUserIsEligiblePresenter` is a boolean indicating whether the local user is an eligible presenter.
 */
export const usePresence = (presence, acceptPlaybackChangesFrom, context) => {
    const initializeStartedRef = useRef(false);
    const usersRef = useRef([]);
    const [users, setUsers] = useState(usersRef.current);
    const [localUser, setLocalUser] = useState(null);
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
    }, [localUser, presence, acceptPlaybackChangesFrom]);

    // Effect which registers SharedPresence event listeners before joining space
    useEffect(() => {
        if (
            !presence ||
            presence.isInitialized ||
            !context ||
            initializeStartedRef.current
        )
            return;
        initializeStartedRef.current = true;
        // Register presenceChanged event listener
        presence.on("presenceChanged", (userPresence, local) => {
            console.log("usePresence: presence received", userPresence, local);
            if (local) {
                const user = {
                    userId: userPresence.userId,
                    state: userPresence.state,
                    data: userPresence.data,
                    timestamp: userPresence.timestamp,
                    roles: userPresence.roles,
                };
                setLocalUser(user);
            }
            // Set users local state
            const userArray = presence.toArray();
            setUsers(userArray);
        });
        presence
            .initialize({
                joinedTimestamp: LiveShareClient.getTimestamp(),
            })
            .then(() => {
                console.log("usePresence: started presence");
                setStarted(true);
            })
            .catch((error) => console.error(error));
    }, [presence, context, setUsers, setLocalUser]);

    return {
        presenceStarted,
        localUser,
        users,
        localUserIsEligiblePresenter,
    };
};
