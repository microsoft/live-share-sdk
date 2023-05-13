/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { PresenceState } from "@microsoft/live-share";
import { getRandomAvatar } from "../utils/random-avatar";
import { useStateRef } from "../utils/useStateRef";

export const usePresence = (presence, context) => {
    const initializeStartedRef = useRef(false);
    const [users, setUsers] = useState([]);
    const [localUser, localUserRef, setLocalUser] = useStateRef(undefined);
    const [presenceStarted, setPresenceStarted] = useState(false);

    const localUserIsScrumMaster = localUser?.roles.includes("Organizer");

    const readyUsersCount = users.filter((user) => user.data?.ready).length;

    // Post initial user presence with name as additional data
    const updatePresence = useCallback(
        ({ ready, answer }) => {
            const localUserData = localUserRef.current?.data;
            presence.update({
                avatarIndex: localUserData?.avatarIndex,
                ready: ready !== undefined ? ready : localUserData?.ready,
                answer: answer !== undefined ? answer : localUserData?.answer,
            });
        },
        [presence, localUserRef]
    );

    const changeReadyStatus = useCallback(
        (ready) => {
            updatePresence({ ready });
        },
        [updatePresence]
    );

    const reportAnswer = useCallback(
        (answer) => {
            updatePresence({ answer });
        },
        [updatePresence]
    );

    // Effect which registers SharedPresence event listeners before joining space
    useEffect(() => {
        if (
            !presence ||
            presence.isInitialized ||
            !context ||
            initializeStartedRef.current
        )
            return;
        console.info("usePresence: initializing presence");
        initializeStartedRef.current = true;
        presence.on("presenceChanged", (userPresence, local) => {
            if (local) {
                const localUser = {
                    userId: userPresence.userId,
                    state: userPresence.state,
                    data: userPresence.data,
                    name: userPresence.displayName,
                    roles: userPresence.roles,
                };
                setLocalUser(localUser);
            }
            // Update our local state
            const updatedUsers = presence
                .getUsers(PresenceState.online)
                .map((userPresence) => ({
                    userId: userPresence.userId,
                    state: userPresence.state,
                    data: userPresence.data,
                    name: userPresence.displayName,
                    roles: userPresence.roles,
                }));
            setUsers([...updatedUsers]);
        });
        const defaultAvatarInformation = getRandomAvatar();
        presence
            .initialize(
                {
                    avatarIndex: defaultAvatarInformation.avatarIndex,
                    ready: false,
                },
                PresenceState.online
            )
            .then(() => {
                setPresenceStarted(true);
            })
            .catch((error) => console.error(error));
    }, [presence, context, setPresenceStarted, setLocalUser]);

    return {
        presenceStarted,
        localUser,
        localUserIsScrumMaster,
        users,
        readyUsersCount,
        changeReadyStatus,
        reportAnswer,
        updatePresence,
    };
};
