/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveEventScope } from "../LiveEventScope";
import { LiveEventSource } from "../LiveEventSource";
import { MockRuntimeSignaler } from './MockRuntimeSignaler';

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return {localRuntime, remoteRuntime};
}

describe("LiveEventSource", () => {
    it("Should send events", (done) => {
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime);
        localScope.onEvent('test', (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(signalers.remoteRuntime);
        remoteScope.onEvent('test', (evt, local) => triggered++);

        const localSource = new LiveEventSource(localScope, 'test');
        localSource.sendEvent({});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(triggered == 2);
            done();
        }, 10);
    });
});