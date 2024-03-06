/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import {
    ITestObjectProvider,
    fluidEntryPoint,
    getContainerEntryPointBackCompat,
} from "@fluidframework/test-utils";
import { LiveTimer } from "../LiveTimer";
import { Deferred, waitForDelay } from "../internals";
import { getLiveDataObjectClass } from "../schema-injection-utils";
import { MockLiveShareRuntime } from "./MockLiveShareRuntime";
import { describeCompat } from "@live-share-private/test-utils";

async function getObjects(
    getTestObjectProvider,
    updateInterval: number = 10000
) {
    // Temporarily change update interval
    let liveRuntime1 = new MockLiveShareRuntime(false, updateInterval);
    let liveRuntime2 = new MockLiveShareRuntime(false, updateInterval);

    let ObjectProxy1: any = getLiveDataObjectClass<LiveTimer>(
        LiveTimer,
        liveRuntime1
    );
    let ObjectProxy2: any = getLiveDataObjectClass<LiveTimer>(
        LiveTimer,
        liveRuntime2
    );

    await liveRuntime1.start();
    await liveRuntime2.start();

    let provider: ITestObjectProvider = getTestObjectProvider();

    let container1 = await provider.createContainer(
        ObjectProxy1.factory as fluidEntryPoint
    );
    let object1 = await getContainerEntryPointBackCompat<LiveTimer>(container1);

    let container2 = await provider.loadContainer(
        ObjectProxy2.factory as fluidEntryPoint
    );
    let object2 = await getContainerEntryPointBackCompat<LiveTimer>(container2);
    // need to be connected to send signals
    if (!container1.connect) {
        await new Promise((resolve) => container1.once("connected", resolve));
    }
    if (!container2.connect) {
        await new Promise((resolve) => container2.once("connected", resolve));
    }
    const dispose = () => {
        object1.dispose();
        object2.dispose();
        container1.disconnect?.();
        container2.disconnect?.();
        liveRuntime1.stop();
        liveRuntime2.stop();
    };
    return {
        object1,
        object2,
        dispose,
    };
}
const milliTolerance = 31;

describeCompat("LiveTimer", (getTestObjectProvider) => {
    it("Should raise local and remote start events", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const now = new Date().getTime();
        const object1done = new Deferred();
        object1.on("started", (config, local) => {
            try {
                assert(local == true, `Not a local event`);
                assert(config != null, `Null config arg`);
                assert(config.clientId != null, `Missing clientId`);
                assert(
                    typeof config.configChangedAt == "number",
                    `Missing timestamp`
                );
                assert(config.configChangedAt >= now, `Timestamp too old`);
                object1done.resolve();
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize();

        const object2done = new Deferred();
        object2.on("started", (config, local) => {
            try {
                assert(local == false, `Unexpected local event`);
                assert(config != null, `Null config arg`);
                assert(config.clientId != null, `Missing clientId`);
                assert(
                    typeof config.configChangedAt == "number",
                    `Missing timestamp`
                );
                assert(config.configChangedAt >= now, `Timestamp too old`);
                object2done.resolve();
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.initialize();

        await object1.start(1);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        dispose();
    });

    it("Should throw error if already initialized", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        await object1.initialize();
        try {
            // Ensure initialized
            assert(object1.isInitialized, `not initialized`);

            // Try second call to initialize.
            await object1.initialize();
            assert(false, `exception not thrown`);
        } catch (err) {
            console.error("there was an error");
        }

        object1.dispose();
        object2.dispose();
    });

    it("Should throw error if start(duration) called before initialize", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        try {
            await object1.start(10);
            assert(false, `exception not thrown`);
        } catch (err) {
            console.error("there was an error");
        }

        dispose();
    });

    it("pause and play, check resumes at correct position", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const object1done = new Deferred();
        let pausePosition = 0;
        object1.on("paused", (config, local) => {
            pausePosition = config.position;
        });
        object1.on("played", (config, local) => {
            try {
                assert(pausePosition !== 0, "never paused");
                assert(
                    config.position === pausePosition,
                    `did not resume at pause position`
                );
                object1done.resolve();
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize();

        const object2done = new Deferred();
        object2.on("played", (config, local) => {
            try {
                assert(pausePosition !== 0, "never paused");
                assert(
                    config.position === pausePosition,
                    `did not resume at pause position`
                );
                object2done.resolve();
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.initialize();

        await object1.start(50);
        await waitForDelay(20);
        await object1.pause();
        await waitForDelay(20);
        await object2.play();

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        dispose();
    });

    it("start overrides existing timer", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testDone = new Deferred();
        let startedCounter = 0;
        let finishedCounter = 0;

        object2.on("started", (config, local) => {
            startedCounter += 1;
        });
        object2.on("finished", (config) => {
            finishedCounter += 1;
        });

        let init1 = object1.initialize();
        let init2 = object2.initialize();
        await Promise.all([init1, init2]);

        await object1.start(40);
        await waitForDelay(10);
        await object1.start(40);
        await waitForDelay(10);
        await object1.start(20);
        await waitForDelay(40);
        testDone.resolve();

        // Wait for events to trigger
        await testDone.promise;
        assert(startedCounter === 3, `expect 3, got ${startedCounter}`);
        assert(finishedCounter === 1, `expect 1, got ${finishedCounter}`);

        dispose();
    });

    it("finish callback called within 31ms of ending", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const now = new Date().getTime();
        const object1done = new Deferred();
        object1.on("finished", (config) => {
            try {
                assert(config != null, `Null config arg`);
                assert(config.clientId != null, `Missing clientId`);
                assert(
                    typeof config.configChangedAt == "number",
                    `Missing timestamp`
                );
                const milliDifference =
                    config.configChangedAt - now - config.duration;
                assert(milliDifference <= milliTolerance, `${milliDifference}`);
                object1done.resolve();
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize();

        const object2done = new Deferred();
        object2.on("finished", (config) => {
            try {
                assert(config != null, `Null config arg`);
                assert(config.clientId != null, `Missing clientId`);
                assert(
                    typeof config.configChangedAt == "number",
                    `Missing timestamp`
                );
                const milliDifference =
                    config.configChangedAt - now - config.duration;
                assert(milliDifference <= milliTolerance, `${milliDifference}`);
                object2done.resolve();
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.initialize();

        await object1.start(100);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        dispose();
    });

    it("500 milli tick rate", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const object1done = new Deferred();
        object1.tickRate = 500;
        let tickCounter = 0;
        object1.on("onTick", () => {
            tickCounter += 1;
            console.log("tickCounter", tickCounter);
        });

        object1.on("finished", (config) => {
            console.log(config);
            if (tickCounter == 3) {
                object1done.resolve();
            } else {
                object1done.reject(tickCounter);
            }
        });

        await object1.initialize();
        await object1.start(1600);

        // initialized for test setup
        object2.initialize();

        // Wait for events to trigger
        await object1done.promise;

        dispose();
    });
});
