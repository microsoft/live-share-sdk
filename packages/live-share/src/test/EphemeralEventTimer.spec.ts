/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { EphemeralEventScope } from "../EphemeralEventScope";
import { EphemeralEventTarget } from "../EphemeralEventTarget";
import { EphemeralEventTimer } from '../EphemeralEventTimer';
import { MockRuntimeSignaler } from './MockRuntimeSignaler';

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return {localRuntime, remoteRuntime};
}

describe("EphemeralEventTimer", () => {
    it("Should send a single event after a delay", (done) => {
        let created = 0;
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new EphemeralEventScope(signalers.localRuntime);
        const localTarget = new EphemeralEventTarget(localScope, 'test', (evt, local) => triggered++);
        const localTimer = new EphemeralEventTimer(localTarget, () => {
            created++;
            return {};
        }, 10);

        const remoteScope = new EphemeralEventScope(signalers.remoteRuntime);
        const remoteTarget = new EphemeralEventTarget(remoteScope, 'test', (evt, local) => triggered++);

        localTimer.start();
        assert(created == 0);
        setTimeout(() => {
            assert(created == 1, `Message creation count is ${created}`);
            assert(triggered == created * 2, `Messages created is ${created} but received is an unexpected ${triggered}`);
            localTimer.stop();
            done();
        }, 30);
    });

    it("Should repeatedly send events after a delay", (done) => {
        let created = 0;
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new EphemeralEventScope(signalers.localRuntime);
        const localTarget = new EphemeralEventTarget(localScope, 'test', (evt, local) => triggered++);
        const localTimer = new EphemeralEventTimer(localTarget, () => {
            created++;
            return {};
        }, 5, true);

        const remoteScope = new EphemeralEventScope(signalers.remoteRuntime);
        const remoteTarget = new EphemeralEventTarget(remoteScope, 'test', (evt, local) => triggered++);

        localTimer.start();
        assert(created == 0);
        setTimeout(() => {
            assert(created > 1, `Message creation count is ${created}`);
            assert(triggered == created * 2, `Messages created is ${created} but received is an unexpected ${triggered}`);
            localTimer.stop();
            done();
        }, 30);
    });
});