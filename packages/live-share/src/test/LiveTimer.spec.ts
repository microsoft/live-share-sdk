/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { LiveTimer } from "../LiveTimer";
import { Deferred } from "../internals";
import { LiveShareRuntime } from "../LiveShareRuntime";
import { DataObjectClass } from "fluid-framework";
import { TestLiveShareHost } from "../TestLiveShareHost";
import { LocalTimestampProvider } from "../LocalTimestampProvider";
import { getLiveDataObjectClassProxy } from "../schema-utils";

describeNoCompat("LiveTimer", (getTestObjectProvider) => {
    // Target for milliTolerance is 30ms, but very rarely we see 31 due to JS callback scheduling is not exact.
    const milliTolerance = 31;
    let provider: ITestObjectProvider;
    let object1: LiveTimer;
    let object2: LiveTimer;

    let liveRuntime1 = new LiveShareRuntime(
        TestLiveShareHost.create(),
        new LocalTimestampProvider()
    );
    let liveRuntime2 = new LiveShareRuntime(
        TestLiveShareHost.create(),
        new LocalTimestampProvider()
    );

    let ObjectProxy1 = getLiveDataObjectClassProxy<LiveTimer>(
        LiveTimer,
        liveRuntime1
    ) as DataObjectClass<LiveTimer>;
    let ObjectProxy2 = getLiveDataObjectClassProxy<LiveTimer>(
        LiveTimer,
        liveRuntime2
    ) as DataObjectClass<LiveTimer>;

    afterEach(async () => {
        // restore defaults
        liveRuntime1 = new LiveShareRuntime(
            TestLiveShareHost.create(),
            new LocalTimestampProvider()
        );
        liveRuntime2 = new LiveShareRuntime(
            TestLiveShareHost.create(),
            new LocalTimestampProvider()
        );
    });

    beforeEach(async () => {
        provider = getTestObjectProvider();
        const container1 = await provider.createContainer(ObjectProxy1.factory);
        object1 = await requestFluidObject<LiveTimer>(container1, "default");

        const container2 = await provider.loadContainer(ObjectProxy2.factory);
        object2 = await requestFluidObject<LiveTimer>(container2, "default");

        // need to be connected to send signals
        if (!container1.connect) {
            await new Promise((resolve) =>
                container1.once("connected", resolve)
            );
        }
        if (!container2.connect) {
            await new Promise((resolve) =>
                container2.once("connected", resolve)
            );
        }
    });

    it("Should raise local and remote start events", async () => {
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

        object1.start(1);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should throw error if already initialized", async () => {
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
    });

    it("Should throw error if start(duration) called before initialize", async () => {
        try {
            await object1.start(10);
            assert(false, `exception not thrown`);
        } catch (err) {
            console.error("there was an error");
        }
    });

    it("pause and play, check resumes at correct position", async () => {
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
        object1.initialize();

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
        object2.initialize();

        object1.start(50);

        setTimeout(() => {
            object1.pause();
            setTimeout(() => {
                object2.play();
            }, 20);
        }, 20);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("start overrides existing timer", async () => {
        const testDone = new Deferred();
        let startedCounter = 0;
        let finishedCounter = 0;

        object2.on("started", (config, local) => {
            startedCounter += 1;
        });
        object2.on("finished", (config) => {
            finishedCounter += 1;
        });

        object1.initialize();
        object2.initialize();

        object1.start(40);
        setTimeout(() => {
            object1.start(40);
            setTimeout(() => {
                object1.start(20);
                setTimeout(() => {
                    testDone.resolve();
                }, 30);
            }, 10);
        }, 10);

        // Wait for events to trigger
        await testDone.promise;
        assert(startedCounter === 3, `${startedCounter}`);
        assert(finishedCounter === 1, `${finishedCounter}`);
    });

    it("finish callback called within 31ms of ending", async () => {
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
        object1.initialize();

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
        object2.initialize();

        object1.start(100);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("500 milli tick rate", async () => {
        const object1done = new Deferred();
        object1.tickRate = 500;
        let tickCounter = 0;
        object1.on("onTick", () => {
            tickCounter += 1;
        });

        object1.on("finished", (config) => {
            console.log(config);
            if (tickCounter == 3) {
                object1done.resolve();
            } else {
                object1done.reject(tickCounter);
            }
        });

        object1.initialize();
        object1.start(1600);

        // Wait for events to trigger
        await object1done.promise;
    });
});
