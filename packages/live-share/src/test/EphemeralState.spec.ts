/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { EphemeralObjectSynchronizer } from "../EphemeralObjectSynchronizer";
import { EphemeralState } from "../EphemeralState";
import { Deferred } from './Deferred';

interface TestStateData {
    value: string;
}

describeNoCompat("EphemeralState", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    let object1: EphemeralState<TestStateData>;
    let object2: EphemeralState<TestStateData>;

    // Temporarily change update interval
    before(() => EphemeralObjectSynchronizer.updateInterval = 20);
    after(() => EphemeralObjectSynchronizer.updateInterval = 15000);

    beforeEach(async () => {
        provider = getTestObjectProvider();
        const container1 = await provider.createContainer(EphemeralState.factory);
        object1 = await requestFluidObject<EphemeralState<TestStateData>>(container1, "default");

        const container2 = await provider.loadContainer(EphemeralState.factory);
        object2 = await requestFluidObject<EphemeralState<TestStateData>>(container2, "default");

        // need to be connected to send signals
        if (!container1.connected) {
            await new Promise((resolve) => container1.once("connected", resolve));
        }
        if (!container2.connected) {
            await new Promise((resolve) => container2.once("connected", resolve));
        }
    });

    it("Should changeState() to new state and value", async () => {
        const object1done = new Deferred();
        object1.on("stateChanged", (state, data, local) => {
            try {
                if (local) {
                    assert(state == 'newState', `object1: state == '${state}'`);
                    assert(typeof data == 'object', `object1: data is NULL`);
                    assert(data.value == 'newValue', `object1: data == '${data}'`);
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.start();

        const object2done = new Deferred();
        object2.on("stateChanged", (state, data, local) => {
            try {
                if (!local) {
                    assert(state == 'newState', `object2: state == '${state}'`);
                    assert(typeof data == 'object', `object2: data is NULL`);
                    assert(data.value == 'newValue', `object2: data == '${data}'`);
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.start();

        object1.changeState('newState', { value: 'newValue' });

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should changeState() to new value for same state", async () => {
        const done = new Deferred();
        object1.on("stateChanged", (state, data, local) => {
            try {
                if (!local) {
                    assert(state == 'testState', `object1: state == '${state}'`);
                    assert(data.value == 'secondValue', `object1: data == '${data}'`);
                    done.resolve();
                }
            } catch (err) {
                done.reject(err);
            }
        });
        await object1.start();

        object2.on("stateChanged", (state, data, local) => {
            try {
                if (!local) {
                    assert(state == 'testState', `object2: state == '${state}'`);
                    assert(data.value == 'firstValue', `object2: data == '${data}'`);
                    object2.changeState(state, { value: 'secondValue' });
                }
            } catch (err) {
                done.reject(err);
            }
        });
        await object2.start();

        object1.changeState('testState', { value: 'firstValue' });

        // Wait for events to trigger
        await done.promise;
    });
});
