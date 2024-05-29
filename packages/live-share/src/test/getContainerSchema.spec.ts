/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveEvent, TestLiveShareHost } from "@microsoft/live-share";
import { strict as assert } from "assert";
import { ContainerSchema } from "fluid-framework";
import { SharedString } from "@fluidframework/sequence/legacy";
import { LiveShareClient } from "../LiveShareClient";
import { SharedMap } from "fluid-framework/legacy";

class TestLiveShareClient extends LiveShareClient {
    // exposes protected method as public
    public getContainerSchema(schema?: ContainerSchema) {
        return super.getContainerSchema(schema);
    }
}

describe("getContainerSpec", () => {
    it("Container schema should have expected initialObjects with no additional initialObjects defined", () => {
        const testLiveShareClient = new TestLiveShareClient(
            TestLiveShareHost.create()
        );
        const schema1 = testLiveShareClient.getContainerSchema();
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
        const testLiveShareClient = new TestLiveShareClient(
            TestLiveShareHost.create()
        );
        const schema1 = testLiveShareClient.getContainerSchema({
            initialObjects: {
                testMap1: SharedMap,
                sharedString1: SharedString,
                sharedEvent1: LiveEvent,
            },
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
