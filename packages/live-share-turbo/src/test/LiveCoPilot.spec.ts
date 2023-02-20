/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { IFluidContainer } from "fluid-framework";
import { TestLiveShareHost } from "@microsoft/live-share";
import { LiveShareTurboClient } from "../LiveShareTurboClient";
import { LiveCoPilot } from "../dds-objects";
import { AzureContainerServices } from "@fluidframework/azure-client";

describe("LiveCoPilot", () => {
    (window.performance as any).mark = () => {
        return {};
    };
    (window.performance as any).measure = () => {
        return {};
    };

    let containerId: string | undefined;
    const getContainerId = (): string | undefined => {
        return containerId;
    };
    const setContainerId = (newContainerId: string) => {
        containerId = newContainerId;
    };
    const host = TestLiveShareHost.create(getContainerId, setContainerId);
    const client1 = new LiveShareTurboClient(host);
    const client2 = new LiveShareTurboClient(host);

    const testLiveCoPilotKey = "TEST-LIVE-EVENT-KEY";
    let results1: {
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    };
    let results2: {
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    };

    beforeEach(async () => {
        containerId = undefined;
        results1 = await client1.join();
        results2 = await client2.join();
    });

    it("Should create dds from one client and join from another, correctly handle initial objects", async () => {
        let object1Created = false;
        const promise1 = client1.getDDS<LiveCoPilot>(
            testLiveCoPilotKey,
            LiveCoPilot,
            (dds: LiveCoPilot) => {
                object1Created = true;
                assert(
                    dds !== undefined,
                    "dds is not defined in onFirstInitialize callback"
                );
            }
        );
        let object2Created = false;
        const promise2 = client2.getDDS<LiveCoPilot>(
            testLiveCoPilotKey,
            LiveCoPilot,
            (dds: LiveCoPilot) => {
                object2Created = true;
                assert(
                    dds !== undefined,
                    "dds is not defined in onFirstInitialize callback"
                );
            }
        );

        // Wait for dds to to be created
        const [dds1, dds2] = await Promise.all([promise1, promise2]);

        assert(
            dds1 !== undefined && dds2 !== undefined,
            "test dds not defined"
        );
        // Only one should be marked as created
        assert(
            [object1Created, object2Created].filter((created) => created)
                .length === 1,
            "Incorrect number of dds created"
        );

        // TODO: validate that LiveCoPilot is working properly
    });
});
