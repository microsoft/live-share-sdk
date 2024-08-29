/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    DataObjectFactory,
    createDataObjectKind,
} from "@fluidframework/aqueduct/internal";
import { IEvent } from "@fluidframework/core-interfaces";
import {
    UserMeetingRole,
    ILiveEvent,
    LiveDataObjectInitializeState,
} from "./interfaces.js";
import { LiveEventScope } from "./internals/LiveEventScope.js";
import { LiveEventTarget } from "./internals/LiveEventTarget.js";
import { DynamicObjectRegistry } from "./internals/DynamicObjectRegistry.js";
import { LiveDataObject } from "./internals/LiveDataObject.js";
import {
    LiveDataObjectInitializeNotNeededError,
    LiveDataObjectNotInitializedError,
    UnexpectedError,
} from "./errors.js";
import { SharedObjectKind } from "fluid-framework";
import { cloneValue } from "./internals/utils.js";

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
export class LiveEventClass<TEvent = any> extends LiveDataObject<{
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
        LiveEventClass.TypeName,
        LiveEventClass,
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
     * 
     * @example
     ```ts
        import { LiveShareClient, LiveEvent } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";


        // Join the Fluid container and create LiveEvent instance
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        const messages = await client.getDDS("unique-id", LiveEvent<string>);

        // Register listener to receive events sent through this object.
        messages.on("received", async (event: string, local: boolean, clientId: string) => {
            console.log("Received message:", event, "from clientId", clientId);
        });

        // Initialize LiveEvent
        await messages.initialize();

        // Can now safely send events
        await messages.send("Hello world");
     ```
     */
    public initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        LiveDataObjectInitializeNotNeededError.assert(
            "LiveEvent:initialize",
            this.initializeState
        );
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
     * 
     * @example
     ```ts
        import { LiveShareClient, LiveEvent } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";

        // Declare interface for type of custom data for user
        interface ICustomReaction {
            emoji: string;
            forUserId: string;
        }

        // Join the Fluid container and create LiveEvent instance
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        const reactions = await client.getDDS("unique-id", LiveEvent<ICustomReaction>);

        // Register listener to receive events sent through this object.
        reactions.on("received", async (event: ICustomReaction, local: boolean, clientId: string) => {
            console.log("Received reaction:", event, "from clientId", clientId);
        });

        // Initialize LiveEvent prior to sending event
        await reactions.initialize();
        await reactions.send({
            emoji: "❤️",
            forUserId: "SOME_OTHER_USER_ID",
        });
     ```
     */
    public async send(evt: TEvent): Promise<ILiveEvent<TEvent>> {
        LiveDataObjectNotInitializedError.assert(
            "LiveEvent:send",
            "send",
            this.initializeState
        );
        UnexpectedError.assert(
            !!this._eventTarget,
            "LiveEvent:send",
            "`this._eventTarget` is undefined, implying there was an error during initialization that should not occur."
        );

        return await this._eventTarget.sendEvent(evt);
    }
}

export type LiveEvent<TEvent = any> = LiveEventClass<TEvent>;

// eslint-disable-next-line no-redeclare
export const LiveEvent = (() => {
    const kind = createDataObjectKind(LiveEventClass);
    return kind as typeof kind & SharedObjectKind<LiveEventClass>;
})();

/**
 * Register `LiveEvent` as an available `SharedObjectKind` for use in dynamic object loading.
 */
DynamicObjectRegistry.registerObjectClass(LiveEvent, LiveEvent.TypeName);
