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
import { LiveEvent } from "../LiveEvent";
import { Deferred } from "../internals";
import { MockTimestampProvider } from "./MockTimestampProvider";
import { MockRoleVerifier } from "./MockRoleVerifier";
import { LocalTimestampProvider } from "../LocalTimestampProvider";
import { UserMeetingRole, ILiveEvent } from "../interfaces";
import { TestLiveShareHost } from "../TestLiveShareHost";
import { getLiveDataObjectClass } from "../internals/schema-injection-utils";
import { LiveShareRuntime } from "../LiveShareRuntime";
import { describeCompat } from "@live-share-private/test-utils";
import { DataObjectClass } from "../internals/fluid-duplicated";

describeCompat("LiveEvent", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    let object1: LiveEvent;
    let object2: LiveEvent;
    let liveRuntime1: LiveShareRuntime = new LiveShareRuntime(
        TestLiveShareHost.create(),
        {
            timestampProvider: new LocalTimestampProvider(),
        }
    );
    let LiveEventProxy1 = getLiveDataObjectClass<LiveEvent>(
        LiveEvent,
        liveRuntime1
    ) as DataObjectClass<LiveEvent>;
    let liveRuntime2: LiveShareRuntime = new LiveShareRuntime(
        TestLiveShareHost.create(),
        {
            timestampProvider: new LocalTimestampProvider(),
        }
    );
    let LiveEventProxy2 = getLiveDataObjectClass<LiveEvent>(
        LiveEvent,
        liveRuntime2
    ) as DataObjectClass<LiveEvent>;

    beforeEach(async () => {
        provider = getTestObjectProvider();

        const container1 = await provider.createContainer(
            LiveEventProxy1.factory as fluidEntryPoint
        );
        object1 = await getContainerEntryPointBackCompat<LiveEvent>(container1);

        const container2 = await provider.loadContainer(
            LiveEventProxy2.factory as fluidEntryPoint
        );
        object2 = await getContainerEntryPointBackCompat<LiveEvent>(container2);

        // need to be connected to send signals
        if (!container1.connect) {
            await new Promise((resolve) =>
                container1.once("connected", resolve)
            );
        }
        if (!container2.connect) {
            await new Promise((resolve) =>
                container2.once("connected", resolve)
            );
        }
    });

    afterEach(async () => {
        // restore defaults
        liveRuntime1.setTimestampProvider(new LocalTimestampProvider());
        liveRuntime2.setTimestampProvider(new LocalTimestampProvider());
    });

    it("Should raise local and remote events", async () => {
        const now = new Date().getTime();
        const object1done = new Deferred();
        object1.on("received", (evt, local, clientId, timestamp) => {
            try {
                assert(local == true, `Not a local event`);
                assert(evt != null, `Null event arg`);
                assert(clientId != null, `Missing clientId`);
                assert(typeof timestamp == "number", `Missing timestamp`);
                assert(timestamp >= now, `Timestamp too old`);
                object1done.resolve();
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize();

        const object2done = new Deferred();
        object2.on("received", (evt, local, clientId, timestamp) => {
            try {
                assert(local == false, `Unexpected local event`);
                assert(evt != null, `Null event arg`);
                assert(clientId != null, `Missing clientId`);
                assert(typeof timestamp == "number", `Missing timestamp`);
                assert(timestamp >= now, `Timestamp too old`);
                object2done.resolve();
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.initialize();

        object1.send({});

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should throw error if already started", async () => {
        await object1.initialize();
        try {
            // Ensure started
            assert(object1.isInitialized, `not started`);

            // Try second call to initialize.
            await object1.initialize();
            assert(false, `exception not thrown`);
        } catch (err) {
            console.error("There was an error");
        }
    });

    it("Should throw error if sendEvent() called before start", async () => {
        try {
            await object1.send({});
            assert(false, `exception not thrown`);
        } catch (err) {
            console.error("There was an error");
        }
    });

    it("Should getTimestamp() using local timestamp provider", () => {
        const now = new Date().getTime();
        const timestamp = liveRuntime1.getTimestamp();
        assert(timestamp >= now);
    });

    it("Should getTimestamp() using custom timestamp providers", async () => {
        const mock = new MockTimestampProvider();
        const customRuntime = new LiveShareRuntime(TestLiveShareHost.create(), {
            timestampProvider: mock,
        });

        const now = new Date().getTime();
        const timestamp = customRuntime.getTimestamp();
        assert(timestamp >= now, `Unexpected timestamp value`);
        assert(mock.called, `Mock not called`);
    });

    it("Should verifyRolesAllowed() using local role verifier", async () => {
        const allowed = await liveRuntime1.verifyRolesAllowed("test", [
            UserMeetingRole.presenter,
        ]);
        assert(allowed, `Role should be allowed`);
    });

    it("Should verifyRolesAllowed() using custom role verifier", async () => {
        const mock = new MockRoleVerifier([UserMeetingRole.presenter]);
        const customRuntime = new LiveShareRuntime(TestLiveShareHost.create(), {
            roleVerifier: mock,
        });

        const allowed = await customRuntime.verifyRolesAllowed("test", [
            UserMeetingRole.presenter,
        ]);
        assert(allowed, `Role should be allowed`);
        assert(mock.called, `mock not called`);
        assert(mock.clientId == "test", `Invalid clientId of ${mock.clientId}`);
    });

    it("Should allow newer received events", () => {
        const current: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const received: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CB",
            timestamp: 1001,
            data: undefined,
        };

        const allowed = LiveEvent.isNewer(current, received);
        assert(allowed, `event blocked`);
    });

    it("Should block older received events", () => {
        const current: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const received: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CB",
            timestamp: 999,
            data: undefined,
        };

        const allowed = LiveEvent.isNewer(current, received);
        assert(!allowed, `event allowed`);
    });

    it("Should block events with same timestamp from same client", () => {
        const current: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const received: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const allowed = LiveEvent.isNewer(current, received);
        assert(!allowed, `event allowed`);
    });

    it("Should allow events with same timestamp and a different clientId that sorts lower", () => {
        const current: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CB",
            timestamp: 1000,
            data: undefined,
        };

        const received: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const allowed = LiveEvent.isNewer(current, received);
        assert(allowed, `event blocked`);
    });

    it("Should block events with same timestamp and a different clientId that sorts higher", () => {
        const current: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const received: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CB",
            timestamp: 1000,
            data: undefined,
        };

        const allowed = LiveEvent.isNewer(current, received);
        assert(!allowed, `event allowed`);
    });

    it("Should debounce newer events", () => {
        const current: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const received: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CB",
            timestamp: 1050,
            data: undefined,
        };

        const allowed = LiveEvent.isNewer(current, received, 100);
        assert(!allowed, `event allowed`);
    });

    it("Should allow older events that would have debounced the current event", () => {
        const current: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CA",
            timestamp: 1000,
            data: undefined,
        };

        const received: ILiveEvent<undefined> = {
            name: "test",
            clientId: "CB",
            timestamp: 950,
            data: undefined,
        };

        const allowed = LiveEvent.isNewer(current, received, 100);
        assert(allowed, `event blocked`);
    });
});
