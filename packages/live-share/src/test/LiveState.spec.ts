/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import {
    ITestObjectProvider,
    fluidEntryPoint,
    getContainerEntryPointBackCompat,
} from "@fluidframework/test-utils/internal";
import { LiveState } from "../LiveState";
import { Deferred } from "../internals/Deferred";
import { getLiveDataObjectKind } from "../internals/schema-injection-utils";
import { MockLiveShareRuntime } from "../internals/mock/MockLiveShareRuntime";
import {
    describeCompat,
    ITestObjectProviderOptions,
} from "@live-share-private/test-utils";

interface TestStateData {
    status: string;
    value: string;
}

async function getObjects(
    getTestObjectProvider: (
        options?: ITestObjectProviderOptions
    ) => ITestObjectProvider
) {
    // Temporarily change update interval
    let liveRuntime1 = new MockLiveShareRuntime(false);
    let liveRuntime2 = new MockLiveShareRuntime(false);

    let ObjectProxy1: any = getLiveDataObjectKind<LiveState<TestStateData>>(
        LiveState,
        liveRuntime1
    );
    let ObjectProxy2: any = getLiveDataObjectKind<LiveState<TestStateData>>(
        LiveState,
        liveRuntime2
    );

    await liveRuntime1.start();
    await liveRuntime2.start();

    let provider: ITestObjectProvider = getTestObjectProvider();

    let container1 = await provider.createContainer(
        ObjectProxy1.factory as fluidEntryPoint
    );
    let object1 =
        await getContainerEntryPointBackCompat<LiveState<TestStateData>>(
            container1
        );

    let container2 = await provider.loadContainer(
        ObjectProxy2.factory as fluidEntryPoint
    );
    let object2 =
        await getContainerEntryPointBackCompat<LiveState<TestStateData>>(
            container2
        );
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

const mockDefaultValue: TestStateData = {
    status: "defaultState",
    value: "defaultValue",
};

describeCompat("LiveState", (getTestObjectProvider) => {
    it("Should changeState() to new state and value", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const object1done = new Deferred();
        object1.on("stateChanged", (state, local) => {
            try {
                if (local) {
                    assert(
                        typeof state == "object",
                        `object1: data is not an object`
                    );
                    assert(
                        typeof state.status == "string",
                        `object1: state.status is not a string`
                    );
                    assert(
                        typeof state.value == "string",
                        `object1: state.value is not a string`
                    );
                    assert(
                        state.status === "newState",
                        `object1: status == '${JSON.stringify(state.status)}'`
                    );
                    assert(
                        state.value === "newValue",
                        `object1: value == '${JSON.stringify(state.value)}'`
                    );
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });

        const object2done = new Deferred();
        object2.on("stateChanged", (state, local) => {
            try {
                if (!local) {
                    assert(
                        typeof state == "object",
                        `object2: data is not an object`
                    );
                    assert(
                        typeof state.status == "string",
                        `object2: state.status is not a string`
                    );
                    assert(
                        typeof state.value == "string",
                        `object2: state.value is not a string`
                    );
                    assert(
                        state.status == "newState",
                        `object1: status == '${JSON.stringify(state)}'`
                    );
                    assert(
                        state.value == "newValue",
                        `object1: value == '${JSON.stringify(state)}'`
                    );
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        let init1 = object1.initialize(mockDefaultValue);
        let init2 = object2.initialize(mockDefaultValue);

        await Promise.all([init1, init2]);

        assert(
            object1.state.status == mockDefaultValue.status,
            `object1: status == '${object1.state.status}'`
        );

        await object1.set({ status: "newState", value: "newValue" });

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        dispose();
    });

    it("Should changeState() to new value for same state", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const done = new Deferred();
        object1.on("stateChanged", (state, local) => {
            try {
                if (!local) {
                    assert(
                        typeof state == "object",
                        `object1: data is not an object`
                    );
                    assert(
                        typeof state.status == "string",
                        `object1: state.status is not a string`
                    );
                    assert(
                        typeof state.value == "string",
                        `object1: state.value is not a string`
                    );
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
        const init1 = object1.initialize(mockDefaultValue);

        object2.on("stateChanged", (state, local) => {
            try {
                if (!local) {
                    assert(
                        typeof state == "object",
                        `object2: data is not an object`
                    );
                    assert(
                        typeof state.status == "string",
                        `object2: state.status is not a string`
                    );
                    assert(
                        typeof state.value == "string",
                        `object2: state.value is not a string`
                    );
                    assert(
                        state.status == "testState",
                        `object2: status == '${state.status}'`
                    );
                    assert(
                        state.value == "firstValue",
                        `object2: value == '${state.value}'`
                    );
                    object2.set({
                        status: "testState",
                        value: "secondValue",
                    });
                }
            } catch (err) {
                done.reject(err);
            }
        });
        const init2 = object2.initialize(mockDefaultValue);

        await Promise.all([init1, init2]);

        await object1.set({ status: "testState", value: "firstValue" });

        // Wait for events to trigger
        await done.promise;

        dispose();
    });
});
