/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveObjectSynchronizer } from "../LiveObjectSynchronizer";
import { MockRuntimeSignaler } from "./MockRuntimeSignaler";
import { Deferred } from "../internals";
import { MockLiveShareRuntime } from "./MockLiveShareRuntime";

interface ITestState {
    client: "local" | "remote";
}

describe("LiveObjectSynchronizer", () => {
    it("Should send connecting state", async () => {
        const localLiveRuntime = new MockLiveShareRuntime(true, 20);
        const remoteLiveRuntime = new MockLiveShareRuntime(true, 20);
        localLiveRuntime.connectToOtherRuntime(remoteLiveRuntime);
        await localLiveRuntime.start();
        await remoteLiveRuntime.start();

        const done = new Deferred();
        const localRuntime = new MockRuntimeSignaler();
        const localObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            localRuntime,
            localLiveRuntime
        );
        await localObject.start(
            { client: "local" },
            async (state, sender) => {
                try {
                    assert(
                        typeof state.data == "object",
                        `local: missing state received`
                    );
                    assert(
                        state.data.client == "remote",
                        `local: invalid state received: ${state}`
                    );
                    assert(sender, `local: sender  ID not received`);
                    done.resolve();
                } catch (err) {
                    done.reject(err);
                }
                return true;
            },
            () => Promise.resolve(true)
        );

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start(
            { client: "remote" },
            (state, sender) => Promise.resolve(true),
            () => Promise.resolve(true)
        );

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime.stop();
    });

    it("Should delay send connecting state until connected", async () => {
        const localLiveRuntime = new MockLiveShareRuntime(true, 20);
        const remoteLiveRuntime = new MockLiveShareRuntime(true, 20);
        localLiveRuntime.connectToOtherRuntime(remoteLiveRuntime);
        await localLiveRuntime.start();
        await remoteLiveRuntime.start();

        const done = new Deferred();
        const localRuntime = new MockRuntimeSignaler();
        const localObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            localRuntime,
            localLiveRuntime
        );
        await localObject.start(
            { client: "local" },
            (state, sender) => {
                try {
                    assert(
                        typeof state.data == "object",
                        `local: missing state received`
                    );
                    assert(
                        state.data.client == "remote",
                        `local: invalid state received: ${state}`
                    );
                    assert(sender, `local: sender  ID not received`);
                    done.resolve();
                } catch (err) {
                    done.reject(err);
                }
                return Promise.resolve(true);
            },
            () => {
                return Promise.resolve(true);
            }
        );

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start(
            { client: "remote" },
            (state, sender) => {
                return Promise.resolve(true);
            },
            () => {
                assert(
                    remoteRuntime.connected,
                    `remote: sending connect before connected`
                );
                return Promise.resolve(true);
            }
        );

        setTimeout(() => {
            localRuntime.connect();
            remoteRuntime.connect();
        }, 50);

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime.stop();
    });

    it("Should send periodic updates", async () => {
        const localLiveRuntime = new MockLiveShareRuntime(true, 20);
        const remoteLiveRuntime = new MockLiveShareRuntime(true, 20);
        localLiveRuntime.connectToOtherRuntime(remoteLiveRuntime);
        await localLiveRuntime.start();
        await remoteLiveRuntime.start();

        let sent = 0;
        let changesEmitted = 0;
        const done = new Deferred();
        const localRuntime = new MockRuntimeSignaler();
        const localObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            localRuntime,
            localLiveRuntime
        );
        await localObject.start(
            { client: "local" },
            (state, sender) => {
                try {
                    assert(
                        typeof state.data == "object",
                        `local: missing state received`
                    );
                    assert(
                        state.data.client == "remote",
                        `local: invalid state received: ${state}`
                    );
                    assert(sender, `local: sender  ID not received`);
                    // We event is only emitted when the timestamp of a value has changed
                    changesEmitted++;
                    assert(changesEmitted < 2, "received is >= 2");
                } catch (err) {
                    done.reject(err);
                }
                return Promise.resolve(true);
            },
            () => {
                sent++;
                if (sent == 2) {
                    done.resolve();
                }
                // If this is called, it will send out an update
                return Promise.resolve(true);
            }
        );

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start(
            { client: "remote" },
            (state, sender) => {
                return Promise.resolve(true);
            },
            () => Promise.resolve(true)
        );

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime.stop();
    });
});
