/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveEventScope } from "../LiveEventScope";
import { LiveEventTarget } from "../LiveEventTarget";
import { MockRuntimeSignaler } from './MockRuntimeSignaler';

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return {localRuntime, remoteRuntime};
}

describe("LiveEventTarget", () => {
    it("Should receive events", (done) => {
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime);
        const localTarget = new LiveEventTarget(localScope, 'test', (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(signalers.remoteRuntime);
        const remoteTarget = new LiveEventTarget(remoteScope, 'test', (evt, local) => triggered++);

        localTarget.sendEvent({});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(triggered == 2);
            done();
        }, 10);
    });
});