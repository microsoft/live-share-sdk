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

interface TestStateData {
    value: string;
}

describeNoCompat("LiveState", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    let object1: LiveState<TestStateData>;
    let object2: LiveState<TestStateData>;

    // Temporarily change update interval
    before(() => (LiveObjectSynchronizer.updateInterval = 20));
    after(() => (LiveObjectSynchronizer.updateInterval = 15000));

    beforeEach(async () => {
        provider = getTestObjectProvider();
        const container1 = await provider.createContainer(LiveState.factory);
        object1 = await requestFluidObject<LiveState<TestStateData>>(
            container1,
            "default"
        );

        const container2 = await provider.loadContainer(LiveState.factory);
        object2 = await requestFluidObject<LiveState<TestStateData>>(
            container2,
            "default"
        );
    });

    it("Should changeState() to new state and value", async () => {
        const object1done = new Deferred();
        object1.on("stateChanged", (state, data, local) => {
            try {
                if (local) {
                    assert(state == "newState", `object1: state == '${state}'`);
                    assert(typeof data == "object", `object1: data is NULL`);
                    assert(
                        data.value == "newValue",
                        `object1: data == '${data}'`
                    );
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize();

        const object2done = new Deferred();
        object2.on("stateChanged", (state, data, local) => {
            try {
                if (!local) {
                    assert(state == "newState", `object2: state == '${state}'`);
                    assert(typeof data == "object", `object2: data is NULL`);
                    assert(
                        data.value == "newValue",
                        `object2: data == '${data}'`
                    );
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.initialize();

        object1.changeState("newState", { value: "newValue" });

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should changeState() to new value for same state", async () => {
        const done = new Deferred();
        object1.on("stateChanged", (state, data, local) => {
            try {
                if (!local) {
                    assert(
                        state == "testState",
                        `object1: state == '${state}'`
                    );
                    assert(
                        data?.value == "secondValue",
                        `object1: data == '${data}'`
                    );
                    done.resolve();
                }
            } catch (err) {
                done.reject(err);
            }
        });
        await object1.initialize();

        object2.on("stateChanged", (state, data, local) => {
            try {
                if (!local) {
                    assert(
                        state == "testState",
                        `object2: state == '${state}'`
                    );
                    assert(
                        data?.value == "firstValue",
                        `object2: data == '${data}'`
                    );
                    object2.changeState(state, { value: "secondValue" });
                }
            } catch (err) {
                done.reject(err);
            }
        });
        await object2.initialize();

        object1.changeState("testState", { value: "firstValue" });

        // Wait for events to trigger
        await done.promise;
    });
});
