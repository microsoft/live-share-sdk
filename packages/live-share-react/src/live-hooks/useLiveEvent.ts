import {
    LiveEvent,
    LiveEventEvents,
    UserMeetingRole,
} from "@microsoft/live-share";
import React from "react";
import {
    IUseLiveEventResults,
    OnReceivedLiveEventAction,
    SendLiveEventAction,
} from "../types";
import { IReceiveLiveEvent } from "../interfaces";
import { useDynamicDDS } from "../shared-hooks";

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
export function useLiveEvent<TEvent extends object = object>(
    uniqueKey: string,
    allowedRoles?: UserMeetingRole[],
    onReceivedEvent?: OnReceivedLiveEventAction<TEvent>
): IUseLiveEventResults<TEvent> {
    /**
     * Reference boolean for whether hook has registered "listening" events for `LiveEvent`.
     */
    const listeningRef = React.useRef(false);
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
     * User facing: dynamically load the LiveEvent DDS for the given unique key.
     */
    const { dds: liveEvent } = useDynamicDDS<LiveEvent>(
        `<LiveEvent>:${uniqueKey}`,
        LiveEvent
    );

    /**
     * User facing: callback to send event through `LiveEvent`
     */
    const sendEvent: SendLiveEventAction<TEvent> = React.useCallback(
        (event: TEvent) => {
            if (liveEvent?.isInitialized === undefined) {
                console.error(
                    new Error(
                        "Cannot call emitEvent when liveEvent is undefined"
                    )
                );
                return;
            }
            if (!liveEvent.isInitialized) {
                console.error(
                    new Error(
                        "Cannot call emitEvent while liveEvent is not started"
                    )
                );
                return;
            }
            liveEvent?.sendEvent(event);
        },
        [liveEvent?.isInitialized]
    );

    /**
     * Setup change listeners and start `LiveEvent` if needed
     */
    React.useEffect(() => {
        if (listeningRef.current || liveEvent?.isInitialized === undefined)
            return;
        listeningRef.current = true;
        // Register event listener
        const onEventReceived = (event: any, local: boolean) => {
            // If developer passed the optional onReceivedEvent callback, we
            // call it.
            onReceivedEvent?.(event as TEvent, local);
            // Set the received event to our local state
            const received: IReceiveLiveEvent<TEvent> = {
                event: event as TEvent,
                local,
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
            listeningRef.current = false;
            liveEvent?.off(LiveEventEvents.received, onEventReceived);
        };
    }, [liveEvent?.isInitialized]);

    return {
        latestEvent,
        allEvents: allEventsRef.current,
        sendEvent,
        liveEvent,
    };
}
