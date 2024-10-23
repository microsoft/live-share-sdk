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
import { LivePresenceClass } from "../LivePresence.js";
import { PresenceStatus } from "../LivePresenceUser.js";
import { waitForDelay } from "../internals/utils.js";
import { Deferred } from "../internals/Deferred.js";
import {
    IClientInfo,
    IFluidContainerInfo,
    IFluidTenantInfo,
    ILiveShareHost,
    INtpTimeInfo,
    UserMeetingRole,
} from "../interfaces.js";
import { TestLiveShareHost } from "../TestLiveShareHost.js";
import { getLiveDataObjectKind } from "../internals/schema-injection-utils.js";
import { MockLiveShareRuntime } from "../internals/mock/MockLiveShareRuntime.js";
import {
    describeCompat,
    ITestObjectProviderOptions,
} from "@live-share-private/test-utils";
import { SharedObjectKind } from "fluid-framework";
import { createDataObjectKind } from "@fluidframework/aqueduct/internal";

class TestLivePresenceClass<
    TData extends object | undefined | null = object,
> extends LivePresenceClass<TData> {
    public async clientId(): Promise<string> {
        return await this.waitUntilConnected();
    }
}

export type TestLivePresence<TData extends object | undefined | null = object> =
    TestLivePresenceClass<TData>;

// eslint-disable-next-line no-redeclare
export const TestLivePresence = (() => {
    const kind = createDataObjectKind(TestLivePresenceClass<any>);
    return kind as typeof kind & SharedObjectKind<TestLivePresenceClass<any>>;
})();

async function getObjects(
    getTestObjectProvider: (
        options?: ITestObjectProviderOptions
    ) => ITestObjectProvider,
    updateInterval: number = 10000,
    object2canSendBackgroundUpdates = true,
    customHost?: ILiveShareHost
) {
    // Temporarily change update interval
    let liveRuntime1 = new MockLiveShareRuntime(false, updateInterval);
    let liveRuntime2 = new MockLiveShareRuntime(false, updateInterval);
    if (customHost) {
        liveRuntime1.setHost(customHost);
        liveRuntime2.setHost(customHost);
    }
    liveRuntime2.canSendBackgroundUpdates = object2canSendBackgroundUpdates;

    let ObjectProxy1: any = getLiveDataObjectKind<
        TestLivePresence<{ foo: string } | undefined>
    >(TestLivePresence, liveRuntime1);
    let ObjectProxy2: any = getLiveDataObjectKind<
        TestLivePresence<{ foo: string } | undefined>
    >(TestLivePresence, liveRuntime2);

    await liveRuntime1.start();
    await liveRuntime2.start();

    let provider: ITestObjectProvider = getTestObjectProvider();

    let container1 = await provider.createContainer(
        ObjectProxy1.factory as fluidEntryPoint
    );
    let object1 =
        await getContainerEntryPointBackCompat<
            TestLivePresence<{ foo: string } | undefined>
        >(container1);

    let container2 = await provider.loadContainer(
        ObjectProxy2.factory as fluidEntryPoint
    );
    let object2 =
        await getContainerEntryPointBackCompat<
            TestLivePresence<{ foo: string } | undefined>
        >(container2);
    // need to be connected to send signals
    if (!container1.connect) {
        await new Promise((resolve) => container1.once("connected", resolve));
    }
    if (!container2.connect) {
        await new Promise((resolve) => container2.once("connected", resolve));
    }

    const disposeAll = () => {
        object1.dispose();
        object2.dispose();
        container1.disconnect?.();
        container2.disconnect?.();
        liveRuntime1.stop();
        liveRuntime2.stop();
    };
    const disposeObject1 = () => {
        object1.dispose();
        container1.disconnect?.();
        liveRuntime1.stop();
    };
    const disposeObject2 = () => {
        object2.dispose();
        container2.disconnect?.();
        liveRuntime2.stop();
    };
    return {
        object1,
        object2,
        disposeAll,
        disposeObject1,
        disposeObject2,
    };
}

describeCompat(
    "LivePresence",
    (
        getTestObjectProvider: (
            options?: ITestObjectProviderOptions
        ) => ITestObjectProvider
    ) => {
        it("Should exchange initial presence information", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const object1done = new Deferred();
            object1.on("presenceChanged", (user, local) => {
                try {
                    if (!local) {
                        assert(user != null, `user2: Null user arg`);
                        assert(
                            user.status == PresenceStatus.online,
                            `user2: Unexpected presence state of ${user.status}`
                        );
                        assert(
                            user.data == undefined,
                            `user2: Unexpected data object of ${user.data}`
                        );
                        object1done.resolve();
                    }
                } catch (err) {
                    object1done.reject(err);
                }
            });

            assert(!object1.isInitialized, `presence already initialized`);
            await object1.initialize(undefined);
            assert(object1.isInitialized, `presence not initialized`);

            const object2done = new Deferred();
            object2.on("presenceChanged", (user, local) => {
                try {
                    if (!local) {
                        assert(user != null, `user1: Null user arg`);
                        assert(
                            user.status == PresenceStatus.online,
                            `user1: Unexpected presence state of ${user.status}`
                        );
                        assert(
                            user.data == undefined,
                            `user1: Unexpected data object of ${user.data}`
                        );
                        object2done.resolve();
                    }
                } catch (err) {
                    object2done.reject(err);
                }
            });
            await object2.initialize(undefined);

            // Wait for events to trigger
            await Promise.all([object1done.promise, object2done.promise]);

            disposeAll();
        });

        it("test canSendBackgroundUpdates only sends when true", async () => {
            const canSendBackgroundUpdatesObject2 = false;
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider,
                10000,
                canSendBackgroundUpdatesObject2
            );
            const object2done = new Deferred();

            await object1.initialize(undefined);

            let object2PresenceChangeTotalCount: number = 0;

            let object2FromObject2PerspectivePresenceChangeCount: number = 0;
            object2.on("presenceChanged", (user, local) => {
                if (local) {
                    object2FromObject2PerspectivePresenceChangeCount += 1;
                    object2PresenceChangeTotalCount += 1;
                    object2done.resolve();
                }
            });

            let object1FromObject2PerspectivePresenceChangeCount: number = 0;
            object1.on("presenceChanged", (user, local) => {
                if (!local) {
                    object1FromObject2PerspectivePresenceChangeCount += 1;
                    object2PresenceChangeTotalCount += 1;
                }
            });
            await object2.initialize(undefined);

            // as any to access private updateInternal, set background to true
            // should not cause an event to be sent
            const backgroundUpdate = true;
            (object2 as any).updateInternal("hello", false, backgroundUpdate);

            await waitForDelay(1);
            // Wait for events to trigger
            await object2done.promise;

            assert(
                object2FromObject2PerspectivePresenceChangeCount == 2,
                `expected two events from object2 from perspective of object 2, ${object2FromObject2PerspectivePresenceChangeCount}`
            );
            assert(
                object1FromObject2PerspectivePresenceChangeCount == 1,
                `expected one events from object2 from perspective of object 1, ${object1FromObject2PerspectivePresenceChangeCount}`
            );

            assert(
                object1.localUser !== undefined,
                "local user should not be undefined"
            );
            assert(
                object2.localUser !== undefined,
                "local user should not be undefined"
            );
            // should update as not a background update
            const backgroundUpdateFalse = false;
            (object2 as any).updateInternal(
                "hello there",
                false,
                backgroundUpdateFalse
            );
            await waitForDelay(1);

            assert(
                // @ts-ignore invalid, assersion earlier in test is making the linter think this assertion is unintentional.
                object2FromObject2PerspectivePresenceChangeCount == 3,
                `expected 1 more event (3 total) from object2 from perspective of object 2, ${object2FromObject2PerspectivePresenceChangeCount}`
            );
            assert(
                // @ts-ignore invalid, assersion earlier in test is making the linter think this assertion is unintentional.
                object1FromObject2PerspectivePresenceChangeCount == 2,
                `expected 1 more event (2 total) from object2 from perspective of object 1, ${object1FromObject2PerspectivePresenceChangeCount}`
            );
            assert(
                object2PresenceChangeTotalCount == 5,
                `expected five events from object2 that was online, ${object2PresenceChangeTotalCount}`
            );

            disposeAll();
        });

        it("Should start with initial data", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const object1done = new Deferred();
            object1.on("presenceChanged", (user, local) => {
                try {
                    if (!local) {
                        assert(user.data, `user2: NULL data`);
                        assert(
                            user.data.foo == "bar",
                            `user1: Unexpected data object of ${user.data}`
                        );
                        object1done.resolve();
                    }
                } catch (err) {
                    object1done.reject(err);
                }
            });
            await object1.initialize({ foo: "bar" });
            assert(object1.localUser?.status == PresenceStatus.online);
            assert(object1.localUser?.data?.foo == "bar");

            const object2done = new Deferred();
            object2.on("presenceChanged", (user, local) => {
                try {
                    if (!local) {
                        assert(user.data, `user1: NULL data`);
                        assert(
                            user.data.foo == "bar",
                            `user1: Unexpected data object of ${user.data}`
                        );
                        object2done.resolve();
                    }
                } catch (err) {
                    object2done.reject(err);
                }
            });
            await object2.initialize({ foo: "bar" });

            // Wait for events to trigger
            await Promise.all([object1done.promise, object2done.promise]);

            disposeAll();
        });

        it("Should update() user presence", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            let triggered = false;
            const object1done = new Deferred();
            object1.on("presenceChanged", (user, local) => {
                try {
                    if (!local) {
                        if (triggered) {
                            assert(user.data, `user1: NULL data`);
                            assert(
                                user.data.foo == "bar",
                                `user1: Unexpected data object of ${user.data}`
                            );
                            assert(user.status == PresenceStatus.online);
                            object1done.resolve();
                        } else {
                            triggered = true;
                            assert(
                                !user.data,
                                `user1: data object passed when it shouldn't be`
                            );
                            assert(user.status == PresenceStatus.online);
                        }
                    }
                } catch (err) {
                    object1done.reject(err);
                }
            });
            await object1.initialize(undefined);

            const object2Ready = new Deferred();
            object2.on("presenceChanged", (user, local) => {
                object2Ready.resolve();
            });
            await object2.initialize(undefined);

            // Wait for everything to start
            await object2Ready.promise;

            // Update presence
            object2.update({ foo: "bar" });

            // Wait for finish
            await object1done.promise;

            disposeAll();
        });

        it("Should enumerate users with forEach()", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const ready = new Deferred();
            let object1UserId = "";
            let object2UserId = "";
            object1.on("presenceChanged", (user, local) => {
                if (local) {
                    object1UserId = user.userId;
                } else {
                    object2UserId = user.userId;
                }
                if (object1UserId && object2UserId) {
                    ready.resolve();
                }
            });
            await object1.initialize(undefined);
            await object2.initialize(undefined);

            // Wait for ready and perform test
            let user1Found = false;
            let user2Found = false;
            await ready.promise;
            object1.getUsers().forEach((user) => {
                switch (user.userId) {
                    case object1UserId:
                        user1Found = true;
                        break;
                    case object2UserId:
                        user2Found = true;
                        break;
                }
            });

            assert(user1Found && user2Found);

            disposeAll();
        });

        it("Should filter users by state and iterate using forEach()", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const ready = new Deferred();
            let object1UserId = "";
            let object2UserId = "";
            object1.on("presenceChanged", (user, local) => {
                if (local) {
                    object1UserId = user.userId;
                } else {
                    object2UserId = user.userId;
                }
                if (object1UserId && object2UserId) {
                    ready.resolve();
                }
            });
            await object1.initialize(undefined);
            await object2.initialize(undefined);

            // Wait for ready and perform test
            let user1Found = false;
            let user2Found = false;
            await ready.promise;
            object1.getUsers(PresenceStatus.online).forEach((user) => {
                switch (user.userId) {
                    case object1UserId:
                        user1Found = true;
                        break;
                    case object2UserId:
                        user2Found = true;
                        break;
                }
            });

            assert(user1Found && user2Found);

            disposeAll();
        });

        it("Should return members using getUsers()", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const ready = new Deferred();
            object1.on("presenceChanged", (user, local) => {
                if (!local) {
                    ready.resolve();
                }
            });
            await object1.initialize(undefined);
            assert(
                object1.getUsers().length === 1,
                "getUsers() should not start empty"
            );
            await object2.initialize(undefined);

            // Wait for ready and perform test
            await ready.promise;
            const users = object1.getUsers();

            assert(Array.isArray(users), `getUsers() didn't return an array`);
            assert(users.length == 2, `Array has a length of ${users.length}`);

            disposeAll();
        });

        it("Should getCount() of the number of users being tracked", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const ready = new Deferred();
            object1.on("presenceChanged", (user, local) => {
                if (!local) {
                    ready.resolve();
                }
            });
            await object1.initialize(undefined);
            await object2.initialize(undefined);

            // Wait for ready and perform test
            await ready.promise;
            const cnt = object1.getUsers().length;

            assert(cnt == 2);

            disposeAll();
        });

        it("Should filter getCount()", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const ready = new Deferred();
            object1.on("presenceChanged", (user, local) => {
                if (!local) {
                    ready.resolve();
                }
            });
            await object1.initialize(undefined);
            await object2.initialize(undefined);

            // Wait for ready and perform test
            await ready.promise;
            assert(object1.getUsers(PresenceStatus.online).length == 2);
            assert(object1.getUsers(PresenceStatus.away).length == 0);
            assert(object1.getUsers(PresenceStatus.offline).length == 0);

            disposeAll();
        });

        it("Should getUser()", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const ready = new Deferred();
            let object1UserId = "";
            let object2UserId = "";
            object1.on("presenceChanged", (user, local) => {
                if (local) {
                    object1UserId = user.userId;
                } else {
                    object2UserId = user.userId;
                    ready.resolve();
                }
            });
            await object1.initialize(undefined);
            await object2.initialize(undefined);

            // Wait for ready and perform test
            await ready.promise;
            const user1 = object1.getUser(object1UserId);
            const user2 = object1.getUser(object2UserId);

            assert(
                user1 && user1.userId == object1UserId,
                `user1: missing or wrong user returned`
            );
            assert(user1.isLocalUser, `user1: not local user`);
            assert(
                user2 && user2.userId == object2UserId,
                `user2: missing or wrong user returned`
            );
            assert(!user2.isLocalUser, `user2: is local user`);

            disposeAll();
        });

        it("Should getPresenceForClient()", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider
            );
            const ready = new Deferred();
            let object1UserId = "";
            let object1ClientId = "";
            let object2UserId = "";
            let object2ClientId = "";
            object1.on("presenceChanged", (user, local, clientId) => {
                if (local) {
                    object1UserId = user.userId;
                    object1ClientId = clientId;
                } else {
                    object2UserId = user.userId;
                    object2ClientId = clientId;
                }
                if (object1UserId && object2UserId) {
                    ready.resolve();
                }
            });
            await object1.initialize(undefined);
            await object2.initialize(undefined);

            // Wait for ready and get client ID's
            await ready.promise;

            assert(await object1.clientId(), "object1.clientId is undefined");
            assert(await object2.clientId(), "object2.clientId is undefined");
            assert(
                (await object1.clientId()) !== (await object2.clientId()),
                "objects should not have the same clientId"
            );

            const users = object1.getUsers();
            assert(
                users.length === 2,
                "expected to have exactly 2 users in member list"
            );
            assert(
                users.filter((user) => user.userId === users[0].userId)
                    .length === 1,
                "should not have any duplicate user ids"
            );

            const user1 = object1.getUserForClient(object1ClientId);
            assert(!!user1, "user1 is not known");
            assert(
                user1.getConnections().length === 1,
                "user1 connection count is not 1"
            );
            const user2 = object1.getUserForClient(object2ClientId);
            assert(!!user2, "user2 is not known");
            assert(
                user2.getConnections().length === 1,
                "user2 connection count is not 1"
            );

            assert(
                user1.userId === object1UserId,
                `user1: missing or wrong user returned, ${user1.userId} !== ${object1UserId}`
            );
            assert(user1.isLocalUser, `user1: not local user`);
            assert(
                user2.userId === object2UserId,
                `user2: missing or wrong user returned, ${user2.userId} !== ${object2UserId}`
            );
            assert(!user2.isLocalUser, `user2: is local user`);

            disposeAll();
        });

        it("Should send periodic presence updates", async () => {
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider,
                20
            );
            const ready = new Deferred();
            object1.on("presenceChanged", (user, local) => {
                if (!local) {
                    ready.resolve();
                }
            });
            object1.expirationPeriod = 0.2;
            await object1.initialize(undefined);

            object2.expirationPeriod = 0.2;
            await object2.initialize(undefined);

            // Wait for ready and then delay
            await ready.promise;
            await waitForDelay(600);

            // Delay for a few updates
            let count = 0;
            object1.getUsers().forEach((user) => {
                count++;
                assert(
                    user.status == PresenceStatus.online,
                    `user[${user.userId}] is ${user.status}`
                );
            });

            assert(count == 2, `Wrong number of users`);

            disposeAll();
        });

        it("isLocalUser should be true for both clients with same userId and contain both clientIds", async () => {
            // set same user test host
            const mockHost = new SameUserLiveShareTestHost();
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider,
                10000,
                true,
                mockHost
            );

            const object1done = new Deferred();
            object1.on("presenceChanged", async (user, local) => {
                try {
                    assert(user != null, `user1: Null user arg`);
                    assert(
                        user.status == PresenceStatus.online,
                        `user1: Unexpected presence state of ${user.status}`
                    );
                    assert(
                        user.data == undefined,
                        `user1: Unexpected data object of ${user.data}`
                    );
                    // If not local, we expect that isLocalUser will become true once we receive a message from the other client
                    if (!local && !user.isLocalUser) {
                        await waitForDelay(50);
                    }
                    assert(user.isLocalUser == true, `user1: should be local`);
                    object1done.resolve();
                } catch (err) {
                    object1done.reject(err);
                }
            });

            const object2done = new Deferred();
            object2.on("presenceChanged", async (user, local) => {
                try {
                    assert(user != null, `user1: Null user arg`);
                    assert(
                        user.status == PresenceStatus.online,
                        `user1: Unexpected presence state of ${user.status}`
                    );
                    assert(
                        user.data == undefined,
                        `user1: Unexpected data object of ${user.data}`
                    );
                    // If not local, we expect that isLocalUser will become true once we receive a message from the other client
                    if (!local && !user.isLocalUser) {
                        await waitForDelay(50);
                    }
                    assert(user.isLocalUser == true, `user1: should be local`);
                    object2done.resolve();
                } catch (err) {
                    object2done.reject(err);
                }
            });

            assert(!object1.isInitialized, `presence already initialized`);
            const init1 = object1.initialize(undefined);
            const init2 = object2.initialize(undefined);
            await Promise.all([init1, init2]);
            assert(object1.isInitialized, `presence not initialized`);

            // Wait for events to trigger
            await Promise.all([object1done.promise, object2done.promise]);

            // cannot check for new clients on same user in `presenceChanged` callback, will evaluate as being equal.
            // wait for a sync to happen, and check for new clients with getUser
            await waitForDelay(50);
            const user1Presence = object1.getUser("user1");
            assert(
                user1Presence !== undefined,
                "user1 should be defined in object1"
            );
            const user2Presence = object2.getUser("user1");
            assert(
                user2Presence !== undefined,
                "user1 should be defined in object2"
            );
            assert(
                user1Presence.getConnections().length == 2,
                "user should have two clients"
            );
            assert(
                user2Presence.getConnections().length == 2,
                "user should have two clients"
            );

            disposeAll();
        });

        it("two connections should have their own data/state for same user, user state should be most recent", async () => {
            // set same user test host
            const mockHost = new SameUserLiveShareTestHost();
            const { object1, object2, disposeAll } = await getObjects(
                getTestObjectProvider,
                10000,
                true,
                mockHost
            );

            const object1Cat = new Deferred();
            const object1Dog = new Deferred();
            object1.on("presenceChanged", async (user, local, clientId) => {
                if (user.data?.foo == "cat") {
                    object1Cat.resolve();
                } else if (user.data?.foo == "dog") {
                    object1Dog.resolve();
                }
            });

            const object2Cat = new Deferred();
            const object2Dog = new Deferred();
            object2.on("presenceChanged", async (user, local, clientId) => {
                if (user.data?.foo == "dog") {
                    object2Dog.resolve();
                } else if (user.data?.foo == "cat") {
                    object2Cat.resolve();
                }
            });

            assert(!object1.isInitialized, `presence already initialized`);
            const init1 = object1.initialize(undefined);
            const init2 = object2.initialize(undefined);
            await Promise.all([init1, init2]);
            assert(object1.isInitialized, `presence not initialized`);

            await object1.update({ foo: "cat" });
            // Wait for events to trigger
            await Promise.all([object1Cat, object2Cat]);
            let object1User = object1.getUser("user1");
            let object2User = object2.getUser("user1");
            assert(
                object1User !== undefined,
                "user1 should be defined in object1"
            );
            assert(
                object2User !== undefined,
                "user1 should be defined in object2"
            );
            assert(
                object1User.getConnections().length == 2,
                "user should have two clients"
            );
            assert(
                object2User.getConnections().length == 2,
                "user should have two clients"
            );
            assert(
                object1User.data?.foo == "cat",
                `object1 data.foo should be cat, instead is ${object1User.data?.foo}`
            );
            assert(
                object2User.data?.foo == "cat",
                `object2 data.foo should be cat, instead is ${object1User.data?.foo}`
            );
            assert(
                object1User.getConnection(await object1.clientId())?.data
                    ?.foo == "cat",
                "object1.connection1 data.foo should be cat"
            );
            assert(
                object1User.getConnection(await object2.clientId())?.data ==
                    undefined,
                "object1.connection2 data.foo should be undefined"
            );
            assert(
                object2User.getConnection(await object1.clientId())?.data
                    ?.foo == "cat",
                "object2.connection1 data.foo should be cat"
            );
            assert(
                object2User.getConnection(await object2.clientId())?.data ==
                    undefined,
                "object2.connection2 data.foo should be undefined"
            );

            await object2.update({ foo: "dog" });
            // Wait for one event loop for remote object1 to receive the change from object2
            await waitForDelay(0);
            // redeclare to supress incorrect lint warning, delete to see
            object1User = object1.getUser("user1")!;
            object2User = object2.getUser("user1")!;

            assert(
                object1User.data?.foo == "dog",
                `object1 data.foo should be dog, instead is ${object1User.data?.foo}`
            );
            assert(
                object2User.data?.foo == "dog",
                `object2 data.foo should be dog, instead is ${object1User.data?.foo}`
            );
            assert(
                object1User?.getConnection(await object1.clientId())?.data
                    ?.foo == "cat",
                "object1.connection1.data.foo should STILL be cat"
            );
            assert(
                object1User?.getConnection(await object2.clientId())?.data
                    ?.foo == "dog",
                "object1.connection2 data.foo should be dog"
            );
            assert(
                object2User?.getConnection(await object1.clientId())?.data
                    ?.foo == "cat",
                "object2.connection1 data.foo should STILL be cat"
            );
            assert(
                object2User?.getConnection(await object2.clientId())?.data
                    ?.foo == "dog",
                "object2.connection2 data.foo should be dog"
            );

            disposeAll();
        });

        it("test away timeout for user and connections", async () => {
            // set same user test host
            const mockHost = new SameUserLiveShareTestHost();
            const {
                object1,
                object2,
                disposeAll,
                disposeObject1,
                disposeObject2,
            } = await getObjects(getTestObjectProvider, 10000, true, mockHost);

            assert(!object1.isInitialized, `presence already initialized`);
            const init1 = object1.initialize(undefined);
            const init2 = object2.initialize(undefined);
            await Promise.all([init1, init2]);
            assert(object1.isInitialized, `presence not initialized`);

            // Wait for events to trigger
            let object1User = object1.getUser("user1");
            let object2User = object2.getUser("user1");
            assert(
                object1User !== undefined,
                "user1 should be defined in object1"
            );
            assert(
                object2User !== undefined,
                "user1 should be defined in object2"
            );
            assert(
                object1User.getConnections().length == 2,
                "user should have two clients"
            );
            assert(
                object2User.getConnections().length == 2,
                "user should have two clients"
            );

            const object2ClientId = await object2.clientId();

            disposeObject2();
            object1.expirationPeriod = 0.1;
            assert(
                object1User.getConnection(object2ClientId)?.status ==
                    PresenceStatus.online,
                "object2 should still be online from object1's perspective"
            );
            await waitForDelay(150);
            assert(
                object1User.getConnection(object2ClientId)?.status ==
                    PresenceStatus.away,
                "object2 should be away"
            );
            disposeObject1();
        });
    }
);

class SameUserLiveShareTestHost implements ILiveShareHost {
    private test = TestLiveShareHost.create();
    getFluidTenantInfo(): Promise<IFluidTenantInfo> {
        return this.test.getFluidTenantInfo();
    }
    getFluidToken(containerId?: string | undefined): Promise<string> {
        return this.test.getFluidToken(containerId);
    }
    getFluidContainerId(): Promise<IFluidContainerInfo> {
        return this.test.getFluidContainerId();
    }
    setFluidContainerId(containerId: string): Promise<IFluidContainerInfo> {
        return this.test.setFluidContainerId(containerId);
    }
    getNtpTime(): Promise<INtpTimeInfo> {
        return this.test.getNtpTime();
    }
    registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        return this.test.registerClientId(clientId);
    }
    getClientRoles(clientId: string): Promise<UserMeetingRole[] | undefined> {
        return this.test.getClientRoles(clientId);
    }
    async getClientInfo(clientId: string): Promise<IClientInfo | undefined> {
        return this.test.getClientRoles(clientId).then((roles) => {
            return {
                userId: "user1",
                roles: roles ?? [],
                displayName: "user1",
            };
        });
    }
}
