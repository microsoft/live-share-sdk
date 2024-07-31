/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveEvent } from "../interfaces.js";
import { LiveEventScope } from "./LiveEventScope.js";

/**
 * Broadcasts live share events to all clients and can be received by an `LiveEventTarget`.
 *
 * @remarks
 * Live objects won't typically create an `LiveEventSource` directly. They will, instead,
 * create an `LiveEventTarget` class, which can both send & receive events.
 * @template TEvent Type of event to broadcast.
 */
export class LiveEventSource<TEvent> {
    private _scope: LiveEventScope;
    private _eventName: string;

    /**
     * Creates a new `LiveEventSource` instance.
     * @param scope Scope to use for sending events.
     * @param eventName Name of the event to broadcast.
     */
    constructor(scope: LiveEventScope, eventName: string) {
        this._scope = scope;
        this._eventName = eventName;
    }

    /**
     * Broadcasts an event to any listening `LiveEventTarget` instances.
     * @param evt Optional. Partial event object to send. The `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId`
     * fields will be automatically populated prior to sending.
     * @returns The full event, including `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId` fields if known.
     */
    public async sendEvent(evt: TEvent): Promise<ILiveEvent<TEvent>> {
        return await this._scope.sendEvent<TEvent>(this._eventName, evt);
    }

    /**
     * Same as `SendEvent` but only sent locally. Useful for events that do not need to be sent as a signal.
     * @param evt Optional. Partial event object. The `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId`
     * fields will be automatically populated.
     * @returns The full event, including `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId` fields if known.
     */
    public async sendLocalEvent(evt: TEvent): Promise<ILiveEvent<TEvent>> {
        return await this._scope.sendLocalEvent<TEvent>(this._eventName, evt);
    }
}
