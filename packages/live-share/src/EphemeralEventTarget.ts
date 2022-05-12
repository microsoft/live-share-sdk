/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EphemeralEventScope, EphemeralEventListener } from "./EphemeralEventScope";
import { EphemeralEventSource } from "./EphemeralEventSource";
import { IEphemeralEvent } from "./interfaces";

export class EphemeralEventTarget<T extends IEphemeralEvent = IEphemeralEvent> extends EphemeralEventSource<T> {
    constructor(scope: EphemeralEventScope, eventName: string, listener: EphemeralEventListener<T>) {
        super(scope, eventName);
        scope.onEvent(eventName, listener);
    }
}