import {
  LivePresence,
  LivePresenceUser,
  PresenceState,
} from "@microsoft/live-share";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IUseLivePresenceResults } from "../types";
import { useDynamicDDS } from "../shared-hooks";

/**
 * React hook for using a Live Share `LivePresence`.
 *
 * @remarks
 * Use this hook if you want to track presence for who is currently using this component, such as
 * who is online or who is viewing a specific document. With presence, you can sent along any custom
 * user data. This is useful for rendering a list of users, profile pictures, cursor positions, and more.
 *
 * @template TData Optional typing for the custom user presence data object. Default is `object` type.

 * @param userId Optional. The unique ID for a user. If none is provided, a random UUID will be generated.
 * @param initialData Optional. Initial presence data object for the user.
 * @param initialPresenceState Optional. Initial status of the user's presence. Default is online.
 * @param uniqueKey Optional. The unique key for `LivePresence`. If one does not yet exist, a new one
 * will be created, otherwise it will use the existing one. Default value is ":<dds-default>"
 * @returns stateful `localUser`, `otherUsers` list, and `allUsers` list. Also returns a callback method
 * to update the local user's presence and the `LivePresence` Fluid object.
 */
export function useLivePresence<TData extends object = object>(
  userId?: string | undefined,
  initialData?: TData | undefined,
  initialPresenceState: PresenceState = PresenceState.online,
  uniqueKey: string = ":<dds-default>"
): IUseLivePresenceResults<TData> {
  /**
   * Reference boolean for whether hook has registered "presenceChanged" events for `LivePresence`.
   */
  const listeningRef = useRef(false);
  /**
   * Stateful all user presence list and its non-user-facing setter method.
   */
  const [allUsers, setAllUsers] = useState<LivePresenceUser<TData>[]>([]);
  /**
   * User facing: dynamically load the LiveEvent DDS for the given unique key.
   */
  const { dds: livePresence } = useDynamicDDS<LivePresence<TData>>(
    `<LivePresence>:${uniqueKey}`,
    LivePresence<TData>
  );
  /**
   * User facing: list of non-local user's presence objects.
   */
  const otherUsers = useMemo<LivePresenceUser<TData>[]>(() => {
    return [...allUsers.filter((user) => !user.isLocalUser)];
  }, [allUsers]);

  /**
   * User facing: local user's presence object.
   */
  const localUser = useMemo<LivePresenceUser<TData> | undefined>(() => {
    return allUsers.find((user) => user.isLocalUser);
  }, [allUsers]);

  /**
   * User facing: callback to update the local user's presence.
   */
  const updatePresence = useCallback(
    (state?: PresenceState | undefined, data?: TData | undefined) => {
      if (!livePresence) {
        console.error(
          new Error("Cannot call updatePresence when presence is undefined")
        );
        return;
      }
      if (!livePresence.isInitialized) {
        console.error(
          new Error("Cannot call updatePresence while presence is not started")
        );
        return;
      }
      livePresence.updatePresence(state, data);
    },
    [livePresence]
  );

  /**
   * Setup change listeners and start `LiveEvent` if needed
   */
  useEffect(() => {
    if (listeningRef.current || !livePresence) return;
    listeningRef.current = true;

    const onPresenceChanged = () => {
      const updatedLocalUsers: LivePresenceUser<TData>[] = [];
      livePresence?.forEach((user) => {
        updatedLocalUsers.push(user);
      });
      setAllUsers(updatedLocalUsers);
    };
    console.log("presenceChanged on");
    livePresence.on("presenceChanged", onPresenceChanged);

    if (!livePresence.isInitialized) {
      console.log("starting presence");
      livePresence.initialize(userId, initialData, initialPresenceState);
    } else {
      console.log("presence already started, updating local cache");
      onPresenceChanged();
    }

    return () => {
      listeningRef.current = false;
      console.log("presenceChanged off");
      livePresence?.off("presenceChanged", onPresenceChanged);
    };
  }, [livePresence]);

  return {
    localUser,
    otherUsers,
    allUsers,
    livePresence,
    updatePresence,
  };
}
