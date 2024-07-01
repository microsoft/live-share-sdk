/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveEventScope, LiveEventListener } from "./LiveEventScope";
import { LiveEventSource } from "./LiveEventSource";

/**
 * Receives events broadcast by an `LiveEventSource`.
 *
 * @remarks
 * All live event targets are also sources. This simplifies the programming model for
 * live event object by letting them create a single object thats capable of broadcasting
 * events to other instances of itself.
 * @template TEvent Type of event to broadcast.
 */
export class LiveEventTarget<TEvent> extends LiveEventSource<TEvent> {
    /**
     * Creates a new `LiveEventTarget` instance.
     * @param scope Scope to use for sending events.
     * @param eventName Name of the event to broadcast.
     * @param listener Function to call when an event is sent or received.
     */
    constructor(
        scope: LiveEventScope,
        eventName: string,
        listener: LiveEventListener<TEvent>
    ) {
        super(scope, eventName);
        scope.onEvent(eventName, listener);
    }
}
