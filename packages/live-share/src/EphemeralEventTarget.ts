/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EphemeralEventScope, EphemeralEventListener } from "./EphemeralEventScope";
import { EphemeralEventSource } from "./EphemeralEventSource";
import { IEphemeralEvent } from "./interfaces";

/**
 * Receives events broadcast by an `EphemeralEventSource`.
 * 
 * @remarks
 * All ephemeral event targets are also sources. This simplifies the programming model for 
 * ephemeral event object by letting them create a single object thats capable of broadcasting
 * events to other instances of itself.
 * @template TEvent Type of event to broadcast.
 */
export class EphemeralEventTarget<TEvent extends IEphemeralEvent = IEphemeralEvent> extends EphemeralEventSource<TEvent> {
    /**
     * Creates a new `EphemeralEventTarget` instance.
     * @param scope Scope to use for sending events.
     * @param eventName Name of the event to broadcast.
     * @param listener Function to call when an event is sent or received.
     */
    constructor(scope: EphemeralEventScope, eventName: string, listener: EphemeralEventListener<TEvent>) {
        super(scope, eventName);
        scope.onEvent(eventName, listener);
    }
}