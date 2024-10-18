/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveObjectSynchronizer } from "../LiveObjectSynchronizer.js";
import { MockRuntimeSignaler } from "../mock/MockRuntimeSignaler.js";
import { Deferred } from "../Deferred.js";
import { waitForDelay } from "../utils.js";
import { MockLiveShareRuntime } from "../mock/MockLiveShareRuntime.js";

interface ITestState {
    client: string;
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
        await localObject.start({
            initialState: { client: "local" },
            updateState: async (state, sender) => {
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
            getLocalUserCanSend: () => Promise.resolve(true),
        });

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start({
            initialState: { client: "remote" },
            updateState: (state, sender) => Promise.resolve(true),
            getLocalUserCanSend: () => Promise.resolve(true),
        });

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
        await localObject.start({
            initialState: { client: "local" },
            updateState: (state, sender) => {
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
            getLocalUserCanSend: () => {
                return Promise.resolve(true);
            },
        });

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start({
            initialState: { client: "remote" },
            updateState: (state, sender) => {
                return Promise.resolve(true);
            },
            getLocalUserCanSend: () => {
                assert(
                    remoteRuntime.connected,
                    `remote: sending connect before connected`
                );
                return Promise.resolve(true);
            },
        });

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
        await localObject.start({
            initialState: { client: "local" },
            updateState: (state, sender) => {
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
                    // The event is only emitted when the timestamp of a value has changed
                    changesEmitted++;
                    assert(changesEmitted < 6, "received is >= 6");
                } catch (err) {
                    done.reject(err);
                }
                return Promise.resolve(true);
            },
            getLocalUserCanSend: (connecting) => {
                if (connecting) {
                    // counting updates not connects
                    return Promise.resolve(true);
                }
                sent++;
                if (sent == 6) {
                    // 6 background updates
                    done.resolve();
                }
                // If this is called, it will send out an update
                return Promise.resolve(true);
            },
        });

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start({
            initialState: { client: "remote" },
            updateState: (state, sender) => {
                return Promise.resolve(true);
            },
            getLocalUserCanSend: () => Promise.resolve(true),
        });

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime.stop();
    });

    it("Should not send periodic updates if dds specific enableBackgroundUpdates is false", async () => {
        const localLiveRuntime = new MockLiveShareRuntime(true, 20);
        const remoteLiveRuntime = new MockLiveShareRuntime(true, 20);
        localLiveRuntime.connectToOtherRuntime(remoteLiveRuntime);
        await localLiveRuntime.start();
        await remoteLiveRuntime.start();

        let sent = 0;
        const done = new Deferred();
        const localRuntime = new MockRuntimeSignaler();
        const localObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            localRuntime,
            localLiveRuntime
        );
        await localObject.start({
            initialState: { client: "local" },
            updateState: (state, sender) => {
                done.reject();
                return Promise.resolve(true);
            },
            getLocalUserCanSend: (connecting) => {
                if (connecting) {
                    // counting updates not connects
                    return Promise.resolve(true);
                }
                sent++;
                if (sent == 6) {
                    // should never resolve, see race with timeout at end
                    done.resolve();
                }
                // If this is called, it will send out an update
                return Promise.resolve(true);
            },
            enableBackgroundUpdates: false,
        });

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start({
            initialState: { client: "remote" },
            updateState: (state, sender) => {
                return Promise.resolve(true);
            },
            getLocalUserCanSend: () => Promise.resolve(true),
            enableBackgroundUpdates: false,
        });

        await Promise.race([done.promise, waitForDelay(300)]);
        assert(sent == 0, `sent ${sent} updates when no updates was expected`);
        localObject.dispose();
        remoteObject.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime.stop();
    });

    it("Should not send periodic updates when canSendBackgroundUpdates is false", async () => {
        const localLiveRuntime = new MockLiveShareRuntime(true, 5);
        localLiveRuntime.canSendBackgroundUpdates = false;
        const remoteLiveRuntime = new MockLiveShareRuntime(true, 5);
        localLiveRuntime.connectToOtherRuntime(remoteLiveRuntime);
        await localLiveRuntime.start();
        await remoteLiveRuntime.start();

        let localSent = 0;
        let remoteSent = 0;
        const done = new Deferred();
        const localRuntime = new MockRuntimeSignaler();
        const localObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            localRuntime,
            localLiveRuntime
        );
        await localObject.start({
            initialState: { client: "local" },
            updateState: (state, sender) => {
                return Promise.resolve(true);
            },
            getLocalUserCanSend: async (connecting) => {
                localSent++;
                if (connecting) {
                    return true;
                }
                // Should not send any events besides connect
                done.reject(
                    new Error(
                        `Should only send max of 1 message (connect) when canSendBackgroundUpdates == false, instead sent ${localSent}`
                    )
                );
                // If this is called, it will send out an update
                return true;
            },
        });

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime
        );
        await remoteObject.start({
            initialState: { client: "remote" },
            updateState: (state, sender) => {
                return Promise.resolve(true);
            },
            getLocalUserCanSend: () => {
                remoteSent++;
                if (remoteSent == 6) {
                    done.resolve();
                }
                return Promise.resolve(true);
            },
        });

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime.stop();
    });

    it("Should only emit connect response to user that connected", async () => {
        // We use targeted signals so that when a user first connects to LiveObjectSynchronizer,
        // ach user responds back with their state only to the user that connects.
        const localLiveRuntime = new MockLiveShareRuntime(true, 20);
        const remoteLiveRuntime1 = new MockLiveShareRuntime(true, 20);
        const remoteLiveRuntime2 = new MockLiveShareRuntime(true, 20);
        localLiveRuntime.connectToOtherRuntime(
            remoteLiveRuntime1,
            remoteLiveRuntime2
        );
        await localLiveRuntime.start();
        await remoteLiveRuntime1.start();
        await remoteLiveRuntime2.start();

        const localDone = new Deferred();
        const localRuntime = new MockRuntimeSignaler();
        const localObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            localRuntime,
            localLiveRuntime
        );
        let localEmitCount = 0;
        await localObject.start({
            initialState: { client: "local" },
            updateState: async (state) => {
                if (localEmitCount === 0) {
                    // The first emit we receive the initial state for remote1
                    try {
                        assert(
                            state.data.client == "remote1",
                            `local: invalid state received: ${state}`
                        );
                    } catch (err) {
                        localDone.reject(err);
                    }
                } else if (localEmitCount === 1) {
                    // The second emit we receive the initial state for remote2
                    try {
                        assert(
                            state.data.client == "remote2",
                            `local: invalid state received: ${state}`
                        );
                        localDone.resolve();
                    } catch (err) {
                        localDone.reject(err);
                    }
                }

                localEmitCount += 1;

                return false;
            },
            getLocalUserCanSend: () => Promise.resolve(true),
        });

        await waitForDelay(5);

        const remote1Done = new Deferred();
        const remoteRuntime1 = new MockRuntimeSignaler();
        const remoteObject1 = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime1,
            remoteLiveRuntime1
        );
        let remote1EmitCount = 0;
        await remoteObject1.start({
            initialState: { client: "remote1" },
            updateState: async (state, sender) => {
                if (remote1EmitCount === 0) {
                    // The first emit we receive a response to their connect event with local's current state.
                    try {
                        assert(
                            state.data.client == "local",
                            `local: invalid state received: ${state}`
                        );
                    } catch (err) {
                        remote1Done.reject(err);
                    }
                } else if (remote1EmitCount === 1) {
                    // The second emit we receive the initial state from remote2.
                    try {
                        assert(
                            state.data.client == "remote2",
                            `local: invalid state received: ${state}`
                        );
                        remote1Done.resolve();
                    } catch (err) {
                        remote1Done.reject(err);
                    }
                }
                remote1EmitCount += 1;
                return false;
            },
            getLocalUserCanSend: () => Promise.resolve(true),
        });

        await waitForDelay(5);

        const remote2Done = new Deferred();
        const remoteRuntime2 = new MockRuntimeSignaler();
        const remoteObject2 = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime2,
            remoteLiveRuntime2
        );
        let remote2EmitCount = 0;
        await remoteObject2.start({
            initialState: { client: "remote2" },
            updateState: async (state, sender) => {
                if (remote2EmitCount === 0) {
                    // The first emit we receive a response to their connect event with local's current state.
                    try {
                        assert(
                            state.data.client == "local",
                            `local: invalid state received: ${state}`
                        );
                    } catch (err) {
                        remote2Done.reject(err);
                    }
                } else if (remote2EmitCount === 1) {
                    // The second emit we receive a response to their connect event with remote1's current state.
                    try {
                        assert(
                            state.data.client == "remote1",
                            `local: invalid state received: ${state}`
                        );
                        remote2Done.resolve();
                    } catch (err) {
                        remote2Done.reject(err);
                    }
                }
                remote2EmitCount += 1;
                return false;
            },
            getLocalUserCanSend: () => Promise.resolve(true),
        });

        await Promise.all([
            localDone.promise,
            remote1Done.promise,
            remote2Done.promise,
        ]);

        await waitForDelay(10);
        assert(
            localEmitCount == 2,
            `Local object should have only received 2 emits, instead received ${localEmitCount}`
        );
        assert(
            remote1EmitCount == 2,
            `remote object 1 should have received 2 emits, instead received ${remote1EmitCount}`
        );
        assert(
            remote2EmitCount == 2,
            `remote object 2 should have received 2 emits, instead received ${remote2EmitCount}`
        );

        localObject.dispose();
        remoteObject1.dispose();
        remoteObject2.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime1.stop();
        remoteLiveRuntime2.stop();
    });
});
