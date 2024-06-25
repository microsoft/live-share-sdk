/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { ContainerSchema, IFluidContainer } from "fluid-framework";
import { SharedMap } from "fluid-framework/legacy";

import {
    AzureContainerServices,
    AzureLocalConnectionConfig,
} from "@fluidframework/azure-client";
import { AzureLiveShareClient } from "../AzureLiveShareClient";
import {
    IInsecureUser,
    InsecureTokenProvider,
} from "@fluidframework/test-runtime-utils/internal";
import { LiveEvent, LiveState } from "@microsoft/live-share";
import { v4 as uuid } from "uuid";

function generateUser(): IInsecureUser {
    const randomUser = {
        id: uuid(),
        name: uuid(),
    };

    return randomUser;
}

describe("AzureTurboClient", () => {
    const connectionProps: AzureLocalConnectionConfig = {
        tokenProvider: new InsecureTokenProvider("fooBar", generateUser()),
        endpoint: "http://localhost:7070",
        type: "local",
    };
    let client1: AzureLiveShareClient;
    let client2: AzureLiveShareClient;

    const testMapKey = "TEST-MAP-KEY";
    const testLiveEventKey = "TEST-LIVE-EVENT-KEY";
    let results1: {
        container: IFluidContainer;
        services: AzureContainerServices;
    };
    let results2: {
        container: IFluidContainer;
        services: AzureContainerServices;
    };

    beforeEach(async () => {
        client1 = new AzureLiveShareClient({
            connection: connectionProps,
        });
        client2 = new AzureLiveShareClient({
            connection: connectionProps,
        });
        const schema: ContainerSchema = {
            initialObjects: {
                [testLiveEventKey]: LiveEvent,
            },
        };
        results1 = await client1.createContainer(schema);
        const containerId = await results1.container.attach();
        results2 = await client2.getContainer(containerId, schema);
    });

    it("Containers should be configured correctly", async () => {
        assert(
            !!client1.results && !!client2.results,
            "client.results results not defined"
        );
        assert(
            !!results1.container || !!results1.services,
            "client1 results container or services are not defined"
        );

        // state map not initialized until dynamic features are used.
        await client1.getDDS<LiveState>("test", LiveState);
        await client2.getDDS<LiveState>("test", LiveState);
        assert(
            !!client1.stateMap || !!client2.stateMap,
            "stateMap is not defined"
        );
    });

    it("Should create dds from one client and join from another, correctly handle initial objects", async () => {
        let object1Created = false;
        const promise1 = client1.getDDS<SharedMap>(
            testMapKey,
            SharedMap,
            (dds: SharedMap) => {
                object1Created = true;
                assert(
                    dds !== undefined,
                    "dds is not defined in onFirstInitialize callback"
                );
            }
        );
        let object2Created = false;
        const promise2 = client2.getDDS<SharedMap>(
            testMapKey,
            SharedMap,
            (dds: SharedMap) => {
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
            "test map(s) not defined"
        );
        // two should be marked as created, one gets discarded after consensus is reached
        assert(
            [object1Created, object2Created].filter((created) => created)
                .length === 2,
            "Incorrect number of objects created"
        );
    });

    it("Should not dynamically load initial objects", async () => {
        let liveEvent1Created = false;
        const liveEventPromise1 = client1.getDDS<LiveEvent>(
            testLiveEventKey,
            LiveEvent,
            () => {
                liveEvent1Created = true;
            }
        );
        let liveEvent2Created = false;
        const liveEventPromise2 = client2.getDDS<LiveEvent>(
            testLiveEventKey,
            LiveEvent,
            () => {
                liveEvent2Created = true;
            }
        );

        // Wait for get dds
        const [liveEvent1, liveEvent2] = await Promise.all([
            liveEventPromise1,
            liveEventPromise2,
        ]);
        assert(
            liveEvent1 !== undefined && liveEvent2 !== undefined,
            "test map(s) not defined"
        );
        // Should be zero because they are created as initialObjects, not through the DynamicObjectManager
        assert(
            [liveEvent1Created, liveEvent2Created].filter((created) => created)
                .length === 0,
            "Incorrect number of liveEvent objects marked as created"
        );
    });
});
