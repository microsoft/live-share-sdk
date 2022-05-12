/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IEphemeralEvent } from "./interfaces";
import { EphemeralEventScope } from "./EphemeralEventScope";

export class EphemeralEventSource<T extends IEphemeralEvent = IEphemeralEvent> {
    private _scope: EphemeralEventScope;
    private _eventName: string;

    constructor(scope: EphemeralEventScope, eventName: string) {
        this._scope = scope;
        this._eventName = eventName;
    }

    public sendEvent(evt: Partial<T> = {}): T {
        return this._scope.sendEvent(this._eventName, evt);
    }
}
