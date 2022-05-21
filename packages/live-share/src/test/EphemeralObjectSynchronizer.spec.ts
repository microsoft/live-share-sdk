/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { EphemeralObjectSynchronizer } from "../EphemeralObjectSynchronizer";
import { MockContainerRuntimeSignaler } from './MockContainerRuntimeSignaler';
import { Deferred } from './Deferred';

function createConnectedSignalers() {
    const localContainer = new MockContainerRuntimeSignaler();
    const remoteContainer = new MockContainerRuntimeSignaler();
    MockContainerRuntimeSignaler.connectContainers([localContainer, remoteContainer]);
    return {localContainer, remoteContainer};
}

describe("EphemeralObjectSynchronizer", () => {
    // Temporarily change update interval
    before(() => EphemeralObjectSynchronizer.updateInterval = 20);
    after(() => EphemeralObjectSynchronizer.updateInterval = 2000);

    it("Should send connecting state", async () => {
        const done = new Deferred();
        const signalers = createConnectedSignalers();
        const localObject = new EphemeralObjectSynchronizer('test', signalers.localContainer, (connecting) => {
                return { client: 'local' };
            }, (connecting, state, sender) => {
                try {
                    assert(typeof state == 'object', `local: missing state received`);
                    assert(state.client == 'remote', `local: invalid state received: ${state}`);
                    assert(sender, `local: sender  ID not received`);
                    if (connecting) {
                        done.resolve();
                    }
                } catch (err) {
                    done.reject(err);
                }
            });

        const remoteObject = new EphemeralObjectSynchronizer('test', signalers.remoteContainer, (connecting) => {
                return { client: 'remote' };
            }, (connecting, state, sender) => { });

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
    });

    it("Should send periodic updates", async () => {
        let received = 0;
        const done = new Deferred();
        const signalers = createConnectedSignalers();
        const localObject = new EphemeralObjectSynchronizer('test', signalers.localContainer, (connecting) => {
                return { client: 'local' };
            }, (connecting, state, sender) => {
                try {
                    assert(typeof state == 'object', `local: missing state received`);
                    assert(state.client == 'remote', `local: invalid state received: ${state}`);
                    assert(sender, `local: sender  ID not received`);
                    if (!connecting) {
                        received++
                        if (received == 2) {
                            done.resolve();
                        }
                    }
                } catch (err) {
                    done.reject(err);
                }
            });

        const remoteObject = new EphemeralObjectSynchronizer('test', signalers.remoteContainer, (connecting) => {
                return { client: 'remote' };
            }, (connecting, state, sender) => { });

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
    });
});