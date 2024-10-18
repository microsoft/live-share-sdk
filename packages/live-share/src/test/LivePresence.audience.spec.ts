/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { TestLiveShareHost } from "../TestLiveShareHost.js";
import { LiveShareClient } from "../LiveShareClient.js";
import { LivePresence } from "../LivePresence.js";
import { PresenceStatus } from "../LivePresenceUser.js";
import { waitForDelay } from "../internals/utils.js";

describe("LivePresence Fluid Audience tests", () => {
    let containerId: string | undefined;
    const getContainerId = (): string | undefined => {
        return containerId;
    };
    const setContainerId = (newContainerId: string) => {
        containerId = newContainerId;
    };
    const host = TestLiveShareHost.create(getContainerId, setContainerId);
    let client1: LiveShareClient;
    let client2: LiveShareClient;

    const testPresenceKey = "TEST-MAP-KEY";

    beforeEach(async () => {
        client1 = new LiveShareClient(host);
        client2 = new LiveShareClient(host);
        containerId = undefined;
        await client1.join();
        await client2.join();
    });

    it("LivePresence User should go offline when Audience member is removed", async () => {
        const promise1 = client1.getDDS<LivePresence>(
            testPresenceKey,
            LivePresence,
            (dds: LivePresence) => {
                assert(
                    dds !== undefined,
                    "dds is not defined in onFirstInitialize callback"
                );
            }
        );
        const promise2 = client2.getDDS<LivePresence>(
            testPresenceKey,
            LivePresence,
            (dds: LivePresence) => {
                assert(
                    dds !== undefined,
                    "dds is not defined in onFirstInitialize callback"
                );
            }
        );

        // Wait for dds to to be created
        const [dds1, dds2] = await Promise.all([promise1, promise2]);

        await dds1.initialize(undefined);
        await dds2.initialize(undefined);

        client1.results?.container.disconnect();

        await waitForDelay(10);

        const onlineFromObject2Perpsective = dds2
            .getUsers()
            .filter((u) => u.status == PresenceStatus.online).length;
        const offlineFromObject2Perpsective = dds2
            .getUsers()
            .filter((u) => u.status == PresenceStatus.offline).length;

        assert(
            onlineFromObject2Perpsective === 1,
            `should have 1 online user, is actually: ${onlineFromObject2Perpsective}`
        );
        assert(
            offlineFromObject2Perpsective === 1,
            `should have 1 offline user, is actually: ${offlineFromObject2Perpsective}`
        );
    });
});
