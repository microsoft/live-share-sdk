/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import { PriorityTimeInterval } from "../internals/PriorityTimeInterval";

describe("PriorityTimeInterval", () => {
    it("Should scale properly with default values in constructor", () => {
        const interval = new PriorityTimeInterval(1000, () => 2);
        assert(interval.milliseconds === 2000);
        assert(interval.seconds === 2);
    });

    it("Should not scale when starting with priority", () => {
        const interval = new PriorityTimeInterval(1000, () => 2, true);
        assert(interval.milliseconds === 1000);
        assert(interval.seconds === 1);
    });

    it("Should not scale when user does not have priority but scaling is disabled", () => {
        const interval = new PriorityTimeInterval(1000, () => 2, false, false);
        assert(interval.milliseconds === 1000);
        assert(interval.seconds === 1);
    });

    it("Should scale properly after changing values", () => {
        const interval = new PriorityTimeInterval(1000, () => 2);
        assert(interval.milliseconds === 2000);
        assert(interval.seconds === 2);
        // Changing settings will break ts checks, since we asserted above that milliseconds was 2000 and ts can't figure out relationship.
        // We ignore ts for lines where this occurs.
        interval.hasPriority = true;

        // @ts-ignore-next
        assert(interval.milliseconds === 1000);
        // @ts-ignore-next
        assert(interval.seconds === 1);

        interval.hasPriority = false;

        // @ts-ignore-next
        assert(interval.milliseconds === 2000);
        // @ts-ignore-next
        assert(interval.seconds === 2);

        interval.shouldPrioritize = false;

        // @ts-ignore-next
        assert(interval.milliseconds === 1000);
        // @ts-ignore-next
        assert(interval.seconds === 1);

        interval.shouldPrioritize = true;

        // @ts-ignore-next
        assert(interval.milliseconds === 2000);
        // @ts-ignore-next
        assert(interval.seconds === 2);
    });

    it("Should dynamically scale depending on scaleBy func response", () => {
        let scaleBy = 2;
        const interval = new PriorityTimeInterval(1000, () => scaleBy);
        assert(interval.milliseconds === 2000);
        assert(interval.seconds === 2);
        // Changing scaleBy will break ts checks, since we asserted above that milliseconds was 2000 and ts can't figure out relationship.
        // We ignore ts for lines where this occurs.
        scaleBy = 3;
        // @ts-ignore-next
        assert(interval.milliseconds === 3000);
        // @ts-ignore-next
        assert(interval.seconds === 3);
    });
});
