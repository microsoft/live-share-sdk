/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    LiveEventEvents,
    UserMeetingRole,
    LiveEvent,
} from "@microsoft/live-share";
import React from "react";
import {
    IUseLiveEventResults,
    OnReceivedLiveEventAction,
    SendLiveEventAction,
} from "../types";
import { IReceiveLiveEvent } from "../interfaces";
import { useDynamicDDS } from "../shared-hooks";
import {
    ActionContainerNotJoinedError,
    ActionLiveDataObjectInitializedError,
    ActionLiveDataObjectUndefinedError,
} from "../internal";
import { useFluidObjectsContext } from "../providers";

/**
 * React hook for using a Live Share `LiveEvent`.
 *
 * @remarks
 * Use this hook if you want to send transient JSON objects to everyone connected to the Fluid container,
 * such as when sending push notifications or reactions.
 *
 * @template TEvent Optional typing for events sent & received. Default is `object` type.
 * @param uniqueKey the unique key for the `LiveEvent`. If one does not yet exist, a new one
 * will be created, otherwise it will use the existing one.
 * @param allowedRoles Optional. The meeting roles eligible to send events through this object.
 * @param onReceivedEvent Optional. Callback method to be called when a new notification is received.
 * @returns stateful `latestEvent` & `allEvents` list, `sendEvent` callback, and the `liveEvent` object.
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
        liveEvent.on(LiveEventEvents.received, onEventReceived);
        if (!liveEvent.isInitialized) {
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
