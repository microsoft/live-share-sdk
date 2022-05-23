/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { EphemeralEventScope } from "../EphemeralEventScope";
import { EphemeralEventSource } from "../EphemeralEventSource";
import { MockRuntimeSignaler } from './MockRuntimeSignaler';

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return {localRuntime, remoteRuntime};
}

describe("EphemeralEventSource", () => {
    it("Should send events", (done) => {
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new EphemeralEventScope(signalers.localRuntime);
        localScope.onEvent('test', (evt, local) => triggered++);

        const remoteScope = new EphemeralEventScope(signalers.remoteRuntime);
        remoteScope.onEvent('test', (evt, local) => triggered++);

        const localSource = new EphemeralEventSource(localScope, 'test');
        localSource.sendEvent({});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(triggered == 2);
            done();
        }, 10);
    });
});