/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  EphemeralEvent,
  // eslint-disable-next-line
  EphemeralPresence,
} from "@microsoft/live-share";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";

/**
 * Hook for tracking users, roles, and who is in control
 *
 * @remarks
 *
 * @param {EphemeralPresence} presence presence object from Fluid container.
 * @param {UserMeetingRole[]} acceptPlaybackChangesFrom List of acceptable roles for playback transport commands.
 * @returns `{started, localUser, users, presentingUser, localUserIsEligiblePresenter, localUserIsPresenting, takeControl}` where:
 * - `presenceStarted` is a boolean indicating whether `presence.start()` has been called.
 * - `localUser` is the local user's presence object.
 * - `users` is an array of user presence objects in the session.
 * - `localUserIsEligiblePresenter` is a boolean indicating whether the local user is an eligible presenter.
 */
export const usePresence = (presence, acceptPlaybackChangesFrom) => {
  const usersRef = useRef([]);
  const [users, setUsers] = useState(usersRef.current);
  const [localUser, setLocalUser] = useState(null);
  const [presenceStarted, setStarted] = useState(false);
  const context = useTeamsContext();

  // Local user is an eligible presenter
  const localUserIsEligiblePresenter = useMemo(() => {
    if (acceptPlaybackChangesFrom.length === 0) {
      return true;
    }
    if (!presence || !localUser) {
      return false;
    }
    return (
      localUser.roles.filter((role) => acceptPlaybackChangesFrom.includes(role))
        .length > 0
    );
  }, [localUser, presence, acceptPlaybackChangesFrom]);

  // Effect which registers SharedPresence event listeners before joining space
  useEffect(() => {
    if (presence && !presence.isStarted && context) {
      // Register presenceChanged event listener
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
        // Set users local state
        const userArray = presence.toArray();
        setUsers(userArray);
      });
      // Start presence tracking
      presence
        .start(context.userObjectId, {
          joinedTimestamp: EphemeralEvent.getTimestamp(),
        })
        .then(() => {
          setStarted(true);
        })
        .catch((error) => console.error(error));
    }
  }, [presence, context, setUsers, setLocalUser]);

  return {
    presenceStarted,
    localUser,
    users,
    localUserIsEligiblePresenter,
  };
};
