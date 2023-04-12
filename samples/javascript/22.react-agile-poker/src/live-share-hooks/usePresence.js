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
        ({ name, ready, answer }) => {
            const localUserData = localUserRef.current?.data;
            presence.updatePresence(PresenceState.online, {
                name: name !== undefined ? name : localUserData?.name,
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
        if (!presence || presence.isInitialized || !context || initializeStartedRef.current) return;
        console.info("usePresence: initializing presence");
        initializeStartedRef.current = true;
        presence.on("presenceChanged", (userPresence, local) => {
            if (local) {
                const localUser = {
                    userId: userPresence.userId,
                    state: userPresence.state,
                    data: userPresence.data,
                    roles: [],
                };
                // Get the roles of the local user
                userPresence
                    .getRoles()
                    .then((roles) => {
                        localUser.roles = roles;
                        // Set local user state
                        setLocalUser(localUser);
                    })
                    .catch((err) => {
                        console.error(err);
                        setLocalUser(localUser);
                    });
            }
            // Update our local state
            const updatedUsers = presence
                .toArray()
                .filter((user) => user.state === PresenceState.online);
            setUsers(updatedUsers);
        });
        const defaultAvatarInformation = getRandomAvatar();
        const userPrincipalName =
            context?.user.userPrincipalName ??
            `${defaultAvatarInformation.name}@contoso.com`;
        const name = userPrincipalName.split("@")[0];

        presence.presenceUpdateInterval = 5;
        presence
            .initialize(
                context?.user?.id,
                {
                    name,
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
