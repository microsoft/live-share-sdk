/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveEvent, TestLiveShareHost } from "@microsoft/live-share";
import { strict as assert } from "assert";
import {
    LoadableObjectClassRecord,
    SharedMap,
    SharedString,
} from "fluid-framework";
import { LiveShareTurboClient } from "../LiveShareTurboClient";

class TestLiveShareTurboClient extends LiveShareTurboClient {
    // exposes protected method as public
    public getContainerSchema(initialObjects?: LoadableObjectClassRecord) {
        return super.getContainerSchema(initialObjects);
    }
}

describe("getContainerSpec", () => {
    it("Container schema should have expected initialObjects with no additional initialObjects defined", () => {
        const testLiveShareTurboClient = new TestLiveShareTurboClient(
            TestLiveShareHost.create()
        );
        const schema1 = testLiveShareTurboClient.getContainerSchema();
        assert(
            schema1.initialObjects.TURBO_STATE_MAP !== undefined,
            "TURBO_STATE_MAP is undefined"
        );
        assert(
            schema1.initialObjects.TURBO_DYNAMIC_OBJECTS !== undefined,
            "TURBO_DYNAMIC_OBJECTS is undefined"
        );
    });

    it("Container schema should have expected initialObjects with no additional initialObjects defined", () => {
        const testLiveShareTurboClient = new TestLiveShareTurboClient(
            TestLiveShareHost.create()
        );
        const schema1 = testLiveShareTurboClient.getContainerSchema({
            testMap1: SharedMap,
            sharedString1: SharedString,
            sharedEvent1: LiveEvent,
        });
        assert(
            schema1.initialObjects.TURBO_STATE_MAP !== undefined,
            "TURBO_STATE_MAP is undefined"
        );
        assert(
            schema1.initialObjects.TURBO_DYNAMIC_OBJECTS !== undefined,
            "TURBO_DYNAMIC_OBJECTS is undefined"
        );
        assert(
            schema1.initialObjects.testMap1 !== undefined,
            "testMap1 is undefined"
        );
        assert(
            schema1.initialObjects.sharedString1 !== undefined,
            "sharedString1 is undefined"
        );
        assert(
            schema1.initialObjects.sharedEvent1 !== undefined,
            "sharedEvent1 is undefined"
        );
    });
});
