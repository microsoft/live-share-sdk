/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IEphemeralEvent } from "./interfaces";
import { EphemeralEventScope } from "./EphemeralEventScope";

/**
 * Broadcasts ephemeral events to all clients and can be received by an `EphemeralEventTarget`.
 *
 * @remarks
 * Ephemeral objects won't typically create an `EphemeralEventSource` directly. They will, instead,
 * create an `EphemeralEventTarget` class, which can both send & receive events.
 * @template TEvent Type of event to broadcast.
 */
export class EphemeralEventSource<TEvent extends IEphemeralEvent = IEphemeralEvent> {
    private _scope: EphemeralEventScope;
    private _eventName: string;

    /**
     * Creates a new `EphemeralEventSource` instance.
     * @param scope Scope to use for sending events.
     * @param eventName Name of the event to broadcast.
     */
    constructor(scope: EphemeralEventScope, eventName: string) {
        this._scope = scope;
        this._eventName = eventName;
    }

    /**
     * Broadcasts an event to any listening `EphemeralEventTarget` instances.
     * @param evt Optional. Partial event object to send. The `IEphemeralEvent.name`,
     * `IEphemeralEvent.timestamp`, and `IEphemeralEvent.clientId`
     * fields will be automatically populated prior to sending.
     * @returns The full event, including `IEphemeralEvent.name`,
     * `IEphemeralEvent.timestamp`, and `IEphemeralEvent.clientId` fields if known.
     */
    public sendEvent(evt: Partial<TEvent> = {}): TEvent {
        return this._scope.sendEvent(this._eventName, evt);
    }
}
