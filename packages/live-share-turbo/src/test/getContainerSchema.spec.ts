import { LiveEvent } from "@microsoft/live-share";
import { strict as assert } from "assert";
import { SharedMap, SharedString } from "fluid-framework";
import { getContainerSchema } from "../internals/getContainerSchema";

describe("getContainerSpec", () => {
    it("Container schema should have expected initialObjects with no additional initialObjects defined", () => {
        const schema1 = getContainerSchema();
        assert(schema1.initialObjects.TURBO_STATE_MAP !== undefined, "TURBO_STATE_MAP is undefined");
        assert(schema1.initialObjects.TURBO_DYNAMIC_OBJECTS !== undefined, "TURBO_DYNAMIC_OBJECTS is undefined");
    });

    it("Container schema should have expected initialObjects with no additional initialObjects defined", () => {
        const schema1 = getContainerSchema({
            testMap1: SharedMap,
            sharedString1: SharedString,
            sharedEvent1: LiveEvent,
        });
        assert(schema1.initialObjects.TURBO_STATE_MAP !== undefined, "TURBO_STATE_MAP is undefined");
        assert(schema1.initialObjects.TURBO_DYNAMIC_OBJECTS !== undefined, "TURBO_DYNAMIC_OBJECTS is undefined");
        assert(schema1.initialObjects.testMap1 !== undefined, "testMap1 is undefined");
        assert(schema1.initialObjects.sharedString1 !== undefined, "sharedString1 is undefined");
        assert(schema1.initialObjects.sharedEvent1 !== undefined, "sharedEvent1 is undefined");
    });
});