/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveObjectSynchronizer } from "../LiveObjectSynchronizer";
import { MockContainerRuntimeSignaler } from "./MockContainerRuntimeSignaler";
import { MockRuntimeSignaler } from "./MockRuntimeSignaler";
import { Deferred } from "./Deferred";

function createConnectedSignalers() {
    const localContainer = new MockContainerRuntimeSignaler();
    const remoteContainer = new MockContainerRuntimeSignaler();
    MockContainerRuntimeSignaler.connectContainers([
        localContainer,
        remoteContainer,
    ]);
    return { localContainer, remoteContainer };
}

describe("LiveObjectSynchronizer", () => {
    // Temporarily change update interval
    before(() => (LiveObjectSynchronizer.updateInterval = 20));
    after(() => (LiveObjectSynchronizer.updateInterval = 5000));

    it("Should send connecting state", async () => {
        const done = new Deferred();
        const localRuntime = new MockRuntimeSignaler();
        const signalers = createConnectedSignalers();
        const localObject = new LiveObjectSynchronizer(
            "test",
            localRuntime,
            signalers.localContainer,
            (connecting) => {
                return { client: "local" };
            },
            (connecting, state, sender) => {
                try {
                    assert(
                        typeof state == "object",
                        `local: missing state received`
                    );
                    assert(
                        state.client == "remote",
                        `local: invalid state received: ${state}`
                    );
                    assert(sender, `local: sender  ID not received`);
                    if (connecting) {
                        done.resolve();
                    }
                } catch (err) {
                    done.reject(err);
                }
            }
        );

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer(
            "test",
            remoteRuntime,
            signalers.remoteContainer,
            (connecting) => {
                return { client: "remote" };
            },
            (connecting, state, sender) => {}
        );

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
    });

    it("Should delay send connecting state until connected", async () => {
        const done = new Deferred();
        const localRuntime = new MockRuntimeSignaler(false, false);
        const signalers = createConnectedSignalers();
        const localObject = new LiveObjectSynchronizer(
            "test",
            localRuntime,
            signalers.localContainer,
            (connecting) => {
                assert(
                    localRuntime.connected,
                    `local: sending connect before connected`
                );
                return { client: "local" };
            },
            (connecting, state, sender) => {
                try {
                    assert(
                        typeof state == "object",
                        `local: missing state received`
                    );
                    assert(
                        state.client == "remote",
                        `local: invalid state received: ${state}`
                    );
                    assert(sender, `local: sender  ID not received`);
                    if (connecting) {
                        done.resolve();
                    }
                } catch (err) {
                    done.reject(err);
                }
            }
        );

        const remoteRuntime = new MockRuntimeSignaler(false, false);
        const remoteObject = new LiveObjectSynchronizer(
            "test",
            remoteRuntime,
            signalers.remoteContainer,
            (connecting) => {
                assert(
                    remoteRuntime.connected,
                    `remote: sending connect before connected`
                );
                return { client: "remote" };
            },
            (connecting, state, sender) => {}
        );

        setTimeout(() => {
            localRuntime.connect();
            remoteRuntime.connect();
        }, 50);

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
    });

    it("Should send periodic updates", async () => {
        let received = 0;
        const done = new Deferred();
        const signalers = createConnectedSignalers();
        const localRuntime = new MockRuntimeSignaler();
        const localObject = new LiveObjectSynchronizer(
            "test",
            localRuntime,
            signalers.localContainer,
            (connecting) => {
                return { client: "local" };
            },
            (connecting, state, sender) => {
                try {
                    assert(
                        typeof state == "object",
                        `local: missing state received`
                    );
                    assert(
                        state.client == "remote",
                        `local: invalid state received: ${state}`
                    );
                    assert(sender, `local: sender  ID not received`);
                    if (!connecting) {
                        received++;
                        if (received == 2) {
                            done.resolve();
                        }
                    }
                } catch (err) {
                    done.reject(err);
                }
            }
        );

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer(
            "test",
            remoteRuntime,
            signalers.remoteContainer,
            (connecting) => {
                return { client: "remote" };
            },
            (connecting, state, sender) => {}
        );

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
    });
});
