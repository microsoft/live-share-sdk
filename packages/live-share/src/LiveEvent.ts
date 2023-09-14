/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory } from "@fluidframework/aqueduct";
import { IEvent } from "@fluidframework/common-definitions";
import {
    UserMeetingRole,
    IClientTimestamp,
    ILiveEvent,
    LiveDataObjectInitializeState,
} from "./interfaces";
import { LiveEventScope } from "./LiveEventScope";
import { LiveEventTarget } from "./LiveEventTarget";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";
import { LiveDataObject } from "./LiveDataObject";
import { cloneValue } from "./internals";

/**
 * Events supported by `LiveEvent` object.
 */
export enum LiveEventEvents {
    /**
     * An event has been sent or received.
     */
    received = "received",
}

/**
 * Event typings for `LiveEvent` class.
 * @template TEvent Type of event to broadcast.
 */
export interface ILiveEventEvents<TEvent> extends IEvent {
    /**
     * A remote event was received or a local event was sent.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.evt The event that was sent/received.
     * @param listener.local If true the `evt` is an event that was sent.
     * @param listener.clientId clientId of sender.
     * @param listener.timestamp timestamp the time message was sent, according to `LiveShareRuntime.getTimestamp()`
     */
    (
        event: "received",
        listener: (
            evt: TEvent,
            local: boolean,
            clientId: string,
            timestamp: number
        ) => void
    ): any;
}

/**
 * Live fluid object that broadcasts an event to other clients and a set of static event
 * related helpers.
 *
 * #### remarks
 * Applications should call `on('received', (evt, local) => {})` to listen for local events sent
 * and remote events received. Events aren't guaranteed to be delivered so you should limit their
 * use to sending events you're ok with potentially being missed. Reactions are a good use case for
 * `LiveEvents`. Use something like the `LiveState` class when syncing state.
 * @template TEvent Type of event to broadcast.
 */
export class LiveEvent<TEvent = any> extends LiveDataObject<{
    Events: ILiveEventEvents<TEvent>;
}> {
    private _eventTarget?: LiveEventTarget<TEvent>;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:LiveEvent`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveEvent.TypeName,
        LiveEvent,
        [],
        {}
    );

    /**
     * Initialize the object to begin sending/receiving events through this DDS.
     *
     * @remarks
     * You should register `received` event listeners before calling this function to ensure no incoming events are missed.
     * `received` events will not be emitted until after this function is called.
     *
     * @param allowedRoles Optional. List of roles allowed to send events.
     *
     * @returns a void promise that resolves once complete.
     *
     * @throws error when `.initialize()` has already been called for this class instance.
     */
    public initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.needed) {
            throw new Error(`LiveEvent already started.`);
        }
        this.initializeState = LiveDataObjectInitializeState.pending;

        this._allowedRoles = allowedRoles ?? [];

        const scope = new LiveEventScope(
            this.runtime,
            this.liveRuntime,
            allowedRoles
        );
        this._eventTarget = new LiveEventTarget(
            scope,
            "event",
            (evt, local) => {
                this.emit(
                    LiveEventEvents.received,
                    cloneValue(evt.data),
                    local,
                    evt.clientId,
                    evt.timestamp
                );
            }
        );

        this.initializeState = LiveDataObjectInitializeState.succeeded;
        return Promise.resolve();
    }

    /**
     * Broadcasts an event to all other clients.
     *
     * @remarks
     * The event will be queued for delivery if the client isn't currently connected.
     *
     * @param evt Event to send. If omitted, an event will still be sent but it won't include any custom event data.
     *
     * @returns A promise with the full event object that was sent, including the timestamp of when the event was sent and the clientId if known.
     * The clientId will be `undefined` if the client is disconnected at time of delivery.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles defined through the `allowedRoles` prop in `.initialize()`.
     */
    public async send(evt: TEvent): Promise<ILiveEvent<TEvent>> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveEvent: not initialized prior to calling \`.send()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this._eventTarget) {
            throw new Error(
                `LiveEvent: this._eventTarget is undefined, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }

        return await this._eventTarget.sendEvent(evt);
    }

    /**
     * Returns true if a received event is newer then the current event.
     *
     * @remarks
     * Used when building new Live objects to process state change events. The `isNewer()`
     * method implements an algorithm that deals with conflicting events that have the same timestamp
     * and older events that should have debounced the current event.
     *
     * - When the received event has the same timestamp as the current event, each events clientId
     *   will be used as a tie breaker. The clientId containing the lower sort order wins any ties.
     * - Older events are generally ignored unless a debounce period is specified. An older event
     *   that should have debounced the current event will be considered newer.
     *
     * The algorithm employed by isNewer() helps ensure that all clients will eventually reach a
     * consistent state with one other.
     * @param current Current event to compare received event against.
     * @param received Received event.
     * @param debouncePeriod Optional. Time in milliseconds to ignore any new events for. Defaults to 0 ms.
     * @returns True if the received event is newer then the current event and should replace the current one.
     */
    public static isNewer(
        current: IClientTimestamp | undefined,
        received: IClientTimestamp,
        debouncePeriod = 0
    ): boolean {
        if (current) {
            if (current.timestamp == received.timestamp) {
                // In a case where both clientId's are blank that's the local client in a disconnected state
                const cmp = (current.clientId || "").localeCompare(
                    received.clientId || ""
                );
                if (cmp <= 0) {
                    // - cmp == 0 is same user. We use to identify events for same user as newer but
                    //   that was causing us to fire duplicate state & presence change events. The better
                    //   approach is to update the timestamp provider to never return the same timestamp
                    //   twice.  (Comparison was changed on 8/2/2022)
                    // - cmp > 0 is a tie breaker so we'll take that event as well (comparing 'a' with 'c'
                    //   will result in a negative value).
                    return false;
                }
            } else if (current.timestamp > received.timestamp) {
                // Did we receive an older event that should have caused us to debounce the current one?
                const delta = current.timestamp - received.timestamp;
                if (delta > debouncePeriod) {
                    return false;
                }
            } else {
                // Is the new event within the debounce period?
                const delta = received.timestamp - current.timestamp;
                if (delta < debouncePeriod) {
                    return false;
                }
            }
        }

        return true;
    }
}

/**
 * Register `LiveEvent` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LiveEvent, LiveEvent.TypeName);
