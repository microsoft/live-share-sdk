/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { PresenceState } from "@microsoft/live-share";
import { getRandomAvatar } from "../utils/random-avatar";
import { useStateRef } from "../utils/useStateRef";

export const usePresence = (presence, localUserId) => {
  const [users, setUsers] = useState([]);
  const [localUser, localUserRef, setLocalUser] = useStateRef(undefined);
  const [presenceStarted, setPresenceStarted] = useState(false);

  const localUserIsScrumMaster = useMemo(() => {
    return localUser?.roles.includes("Organizer");
  }, [localUser]);

  const readyUsersCount = useMemo(() => {
    return users.filter((user) => user.data?.ready).length;
  }, [users]);

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

  const onChangeName = useCallback(
    (name) => {
      updatePresence({ name });
    },
    [updatePresence]
  );

  // Effect which registers SharedPresence event listeners before joining space
  useEffect(() => {
    if (presence && !presence.isStarted && localUserId) {
      console.info("usePresence: starting presence");
      presence.on("presenceChanged", (userPresence, local) => {
        if (local) {
          // Get the roles of the local user
          userPresence.getRoles()
            .then((roles) => {
              // Set local user state
              setLocalUser({
                userId: userPresence.userId,
                state: userPresence.state,
                data: userPresence.data,
                roles,
              });
            })
            .catch((err) => console.error(err));
        }
        // Update our local state
        const updatedUsers = presence
          .toArray()
          .filter((user) => user.state === PresenceState.online);
        setUsers(updatedUsers);
      });
      presence.presenceUpdateInterval = 5;
      const defaultAvatarInformation = getRandomAvatar();
      presence
        .start(
          localUserId,
          {
            name: defaultAvatarInformation.name,
            avatarIndex: defaultAvatarInformation.avatarIndex,
            ready: false,
          },
          PresenceState.online
        )
        .then(() => {
          setPresenceStarted(true);
        })
        .catch((error) => console.error(error));
    }
  }, [presence, localUserId, setPresenceStarted, setLocalUser]);

  return {
    presenceStarted,
    localUser,
    localUserIsScrumMaster,
    users,
    readyUsersCount,
    changeReadyStatus,
    reportAnswer,
    onChangeName,
    updatePresence,
  };
};
