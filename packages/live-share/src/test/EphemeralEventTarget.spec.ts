/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { EphemeralEventScope } from "../EphemeralEventScope";
import { EphemeralEventTarget } from "../EphemeralEventTarget";
import { MockRuntimeSignaler } from './MockRuntimeSignaler';

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return {localRuntime, remoteRuntime};
}

describe("EphemeralEventTarget", () => {
    it("Should receive events", (done) => {
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new EphemeralEventScope(signalers.localRuntime);
        const localTarget = new EphemeralEventTarget(localScope, 'test', (evt, local) => triggered++);

        const remoteScope = new EphemeralEventScope(signalers.remoteRuntime);
        const remoteTarget = new EphemeralEventTarget(remoteScope, 'test', (evt, local) => triggered++);

        localTarget.sendEvent({});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(triggered == 2);
            done();
        }, 10);
    });
});