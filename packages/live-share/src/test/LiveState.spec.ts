/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { LiveObjectSynchronizer } from "../LiveObjectSynchronizer";
import { LiveState } from "../LiveState";
import { Deferred } from "./Deferred";
import { LiveShareRuntime } from "../LiveShareRuntime";
import { TestLiveShareHost } from "../TestLiveShareHost";
import { LocalTimestampProvider } from "../LocalTimestampProvider";
import { getLiveDataObjectClassProxy } from "../schema-utils";
import { DataObjectClass } from "fluid-framework";

interface TestStateData {
    status: string;
    value: string;
}

describeNoCompat("LiveState", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    let object1: LiveState<TestStateData>;
    let object2: LiveState<TestStateData>;

    const mockDefaultValue: TestStateData = {
        status: "defaultState",
        value: "defaultValue",
    };

    // Temporarily change update interval
    before(() => (LiveObjectSynchronizer.updateInterval = 20));
    after(() => (LiveObjectSynchronizer.updateInterval = 15000));

    let liveRuntime1 = new LiveShareRuntime(
        TestLiveShareHost.create(),
        new LocalTimestampProvider()
    );
    let liveRuntime2 = new LiveShareRuntime(
        TestLiveShareHost.create(),
        new LocalTimestampProvider()
    );

    let ObjectProxy1 = getLiveDataObjectClassProxy<LiveState<TestStateData>>(
        LiveState,
        liveRuntime1
    ) as DataObjectClass<LiveState<TestStateData>>;
    let ObjectProxy2 = getLiveDataObjectClassProxy<LiveState<TestStateData>>(
        LiveState,
        liveRuntime2
    ) as DataObjectClass<LiveState<TestStateData>>;

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
        object1 = await requestFluidObject<LiveState<TestStateData>>(
            container1,
            "default"
        );

        const container2 = await provider.loadContainer(ObjectProxy2.factory);
        object2 = await requestFluidObject<LiveState<TestStateData>>(
            container2,
            "default"
        );

        // need to be connected to send signals
        if (!(container1 as any).connected) {
            await new Promise((resolve) =>
                container1.once("connected", resolve)
            );
        }
        if (!(container2 as any).connected) {
            await new Promise((resolve) =>
                container2.once("connected", resolve)
            );
        }
    });

    it("Should changeState() to new state and value", async () => {
        const object1done = new Deferred();
        object1.on("stateChanged", (state, local) => {
            try {
                if (local) {
                    assert(typeof state == "object", `object1: data is NULL`);
                    assert(
                        state.status == "newState",
                        `object1: state == '${state}'`
                    );
                    assert(
                        state.value == "newValue",
                        `object1: state == '${state}'`
                    );
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize(mockDefaultValue);
        assert(
            object1.state.status == mockDefaultValue.status,
            `object2: status == '${object1.state.status}'`
        );

        const object2done = new Deferred();
        object2.on("stateChanged", (state, local) => {
            try {
                if (!local) {
                    assert(typeof state == "object", `object1: data is NULL`);
                    assert(
                        state.status == "newState",
                        `object1: status == '${state}'`
                    );
                    assert(
                        state.value == "newValue",
                        `object1: value == '${state.value}'`
                    );
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.initialize(mockDefaultValue);

        object1.set({ status: "newState", value: "newValue" });

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should changeState() to new value for same state", async () => {
        const done = new Deferred();
        object1.on("stateChanged", (state, local) => {
            try {
                if (!local) {
                    assert(typeof state == "object", `object1: data is NULL`);
                    assert(
                        state.status == "testState",
                        `object1: status == '${state.status}'`
                    );
                    assert(
                        state.value == "secondValue",
                        `object1: value == '${state.value}'`
                    );
                    done.resolve();
                }
            } catch (err) {
                done.reject(err);
            }
        });
        await object1.initialize(mockDefaultValue);

        object2.on("stateChanged", (state, local) => {
            try {
                if (!local) {
                    assert(typeof state == "object", `object1: data is NULL`);
                    assert(
                        state.status == "testState",
                        `object2: status == '${state.status}'`
                    );
                    assert(
                        state.value == "firstValue",
                        `object2: value == '${state.value}'`
                    );
                    object2.set({ status: "testState", value: "secondValue" });
                }
            } catch (err) {
                done.reject(err);
            }
        });
        await object2.initialize(mockDefaultValue);

        object1.set({ status: "testState", value: "firstValue" });

        // Wait for events to trigger
        await done.promise;
    });
});
