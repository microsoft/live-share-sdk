/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    LiveEventEvents,
    UserMeetingRole,
    LiveEvent,
    LiveDataObjectInitializeState,
} from "@microsoft/live-share";
import React from "react";
import {
    IUseLiveEventResults,
    OnReceivedLiveEventAction,
    SendLiveEventAction,
} from "../types/index.js";
import { IReceiveLiveEvent } from "../interfaces/index.js";
import { useDynamicDDS } from "../shared-hooks/index.js";
import {
    ActionContainerNotJoinedError,
    ActionLiveDataObjectInitializedError,
    ActionLiveDataObjectUndefinedError,
} from "../internal/index.js";
import { useFluidObjectsContext } from "../providers/index.js";

/**
 * React hook for using a Live Share `LiveEvent`.
 *
 * @remarks
 * Use this hook if you want to send transient JSON objects to everyone connected to the Fluid container,
 * such as when sending push notifications or reactions.
 * This hook can only be used in a child component of `<LiveShareProvider>` or `<AzureProvider>`.
 *
 * @template TEvent Optional typing for events sent & received. Default is `object` type.
 * @param uniqueKey the unique key for the `LiveEvent`. If one does not yet exist, a new one
 * will be created, otherwise it will use the existing one.
 * @param allowedRoles Optional. The meeting roles eligible to send events through this object.
 * @param onReceivedEvent Optional. Callback method to be called when a new notification is received.
 * @returns stateful `latestEvent` & `allEvents` list, `sendEvent` callback, and the `liveEvent` object.
 * 
 * @example
 ```jsx
import { useLiveEvent } from "@microsoft/live-share-react";

const emojis = ["❤️", "😂", "👍", "👎"];

// Define a unique key that differentiates this usage of `useLiveEvent` from others in your app
const MY_UNIQUE_KEY = "event-key";

// Example component for using useLiveEvent
export const MyCustomEvent = () => {
  const { latestEvent, liveEvent, sendEvent } = useLiveEvent(MY_UNIQUE_KEY);

  // Render loading UI when creating LiveEvent instance for first time
  if (!liveEvent) return <>Loading...</>;

  // Render UI
  return (
    <div>
      {`Latest event: ${latestEvent?.value}, from local user: ${latestEvent?.local}`}
      {"Select a planet below:"}
      {emojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            sendEvent(emoji);
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
 ```
 */
export function useLiveEvent<TEvent = any>(
    uniqueKey: string,
    allowedRoles?: UserMeetingRole[],
    onReceivedEvent?: OnReceivedLiveEventAction<TEvent>
): IUseLiveEventResults<TEvent> {
    /**
     * Stateful latest event (user facing) and its non-user-facing setter method.
     */
    const [latestEvent, setLatestReceived] =
        React.useState<IReceiveLiveEvent<TEvent>>();
    /**
     * Reference for all received/sent events. The current value of this is user-facing. Because
     * this is always set at the same time as latestEvent, it is effectively a stateful value.
     */
    const allEventsRef = React.useRef<IReceiveLiveEvent<TEvent>[]>([]);
    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveEvent } = useDynamicDDS<LiveEvent<TEvent>>(
        uniqueKey,
        LiveEvent<TEvent>
    );

    const { container } = useFluidObjectsContext();

    /**
     * User facing: callback to send event through `LiveEvent`
     */
    const sendEvent: SendLiveEventAction<TEvent> = React.useCallback(
        async (event: TEvent) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "liveEvent",
                    "sendEvent"
                );
            }
            if (liveEvent === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "liveEvent",
                    "sendEvent"
                );
            }
            if (!liveEvent.isInitialized) {
                throw new ActionLiveDataObjectInitializedError(
                    "liveEvent",
                    "sendEvent"
                );
            }
            return await liveEvent.send(event);
        },
        [container, liveEvent]
    );

    /**
     * Setup change listeners and start `LiveEvent` if needed
     */
    React.useEffect(() => {
        if (liveEvent?.isInitialized === undefined) return;
        // Register event listener
        const onEventReceived = (
            event: TEvent,
            local: boolean,
            clientId: string,
            timestamp: number
        ) => {
            // If developer passed the optional onReceivedEvent callback, we
            // call it.
            onReceivedEvent?.(event, local);
            // Set the received event to our local state
            const received: IReceiveLiveEvent<TEvent> = {
                value: event,
                local,
                clientId,
                timestamp,
            };
            allEventsRef.current = [...allEventsRef.current, received];
            setLatestReceived(received);
        };
        // Reset the events list if it allEventRef.current is non-empty.
        // This happens when the `id` a developer provides changes on the fly.
        if (allEventsRef.current.length > 0) {
            allEventsRef.current = [];
            setLatestReceived(undefined);
        }
        liveEvent.on(LiveEventEvents.received, onEventReceived);
        if (
            liveEvent.initializeState === LiveDataObjectInitializeState.needed
        ) {
            // Start live event
            liveEvent.initialize(allowedRoles);
        }

        return () => {
            // on unmount, remove event listeners
            liveEvent?.off(LiveEventEvents.received, onEventReceived);
        };
    }, [liveEvent]);

    return {
        latestEvent,
        allEvents: allEventsRef.current,
        sendEvent,
        liveEvent,
    };
}
