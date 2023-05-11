/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveObjectSynchronizer } from "../LiveObjectSynchronizer";
import { MockContainerRuntimeSignaler } from "./MockContainerRuntimeSignaler";
import { MockRuntimeSignaler } from "./MockRuntimeSignaler";
import { Deferred } from "../internals";
import { LiveShareRuntime } from "../LiveShareRuntime";
import { TestLiveShareHost } from "../TestLiveShareHost";
import { LocalTimestampProvider } from "../LocalTimestampProvider";
import { MockLiveShareRuntime } from "./MockLiveShareRuntime";

interface ITestState { client: "local" | "remote" };

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

        let received = 0;
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
                    received++;
                    if (received == 2) {
                        done.resolve();
                    }
                } catch (err) {
                    done.reject(err);
                }
                return Promise.resolve(true);
            },
            () => Promise.resolve(true)
        );

        const remoteRuntime = new MockRuntimeSignaler();
        const remoteObject = new LiveObjectSynchronizer<ITestState>(
            "test",
            remoteRuntime,
            remoteLiveRuntime,
        );
        await remoteObject.start(
            { client: "remote" },
            (state, sender) => {
                return Promise.resolve(true);
            },
            () => Promise.resolve(true),
        );

        await done.promise;
        localObject.dispose();
        remoteObject.dispose();
        localLiveRuntime.stop();
        remoteLiveRuntime.stop();
    });
});
