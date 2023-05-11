/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { IContainer } from "@fluidframework/container-definitions";
import { LivePresence } from "../LivePresence";
import { PresenceState } from "../LivePresenceUser";
import { waitForDelay } from "../internals";
import { Deferred } from "../internals";
import {
    IClientInfo,
    IFluidContainerInfo,
    IFluidTenantInfo,
    ILiveShareHost,
    INtpTimeInfo,
    UserMeetingRole,
} from "../interfaces";
import { TestLiveShareHost } from "../TestLiveShareHost";
import { DataObjectClass } from "fluid-framework";
import { getLiveDataObjectClassProxy } from "../schema-utils";
import { MockLiveShareRuntime } from "./MockLiveShareRuntime";

async function getObjects(
    getTestObjectProvider,
    updateInterval: number = 10000,
    customHost?: ILiveShareHost
) {
    // Temporarily change update interval
    let liveRuntime1 = new MockLiveShareRuntime(false, updateInterval);
    let liveRuntime2 = new MockLiveShareRuntime(false, updateInterval);
    if (customHost) {
        liveRuntime1.setHost(customHost);
        liveRuntime2.setHost(customHost);
    }

    let ObjectProxy1: any = getLiveDataObjectClassProxy<
        LivePresence<{ foo: string }>
    >(LivePresence, liveRuntime1);
    let ObjectProxy2: any = getLiveDataObjectClassProxy<
        LivePresence<{ foo: string }>
    >(LivePresence, liveRuntime2);

    await liveRuntime1.start();
    await liveRuntime2.start();

    let provider: ITestObjectProvider = getTestObjectProvider();

    let container1 = await provider.createContainer(ObjectProxy1.factory);
    let object1 = await requestFluidObject<LivePresence<{ foo: string }>>(
        container1,
        "default"
    );

    let container2 = await provider.loadContainer(ObjectProxy2.factory);
    let object2 = await requestFluidObject<LivePresence<{ foo: string }>>(
        container2,
        "default"
    );
    // need to be connected to send signals
    if (!container1.connect) {
        await new Promise((resolve) => container1.once("connected", resolve));
    }
    if (!container2.connect) {
        await new Promise((resolve) => container2.once("connected", resolve));
    }

    const dispose = () => {
        object1.dispose();
        object2.dispose();
        container1.disconnect?.();
        container2.disconnect?.();
        liveRuntime1.stop();
        liveRuntime2.stop();
    };
    return {
        object1,
        object2,
        dispose,
    };
}

describeNoCompat("LivePresence", (getTestObjectProvider) => {
    it("Should exchange initial presence information", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            try {
                if (!local) {
                    assert(user != null, `user2: Null user arg`);
                    assert(
                        user.state == PresenceState.online,
                        `user2: Unexpected presence state of ${user.state}`
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
        await object1.initialize();
        assert(object1.isInitialized, `presence not initialized`);

        const object2done = new Deferred();
        object2.on("presenceChanged", (user, local) => {
            try {
                if (!local) {
                    assert(user != null, `user1: Null user arg`);
                    assert(
                        user.state == PresenceState.online,
                        `user1: Unexpected presence state of ${user.state}`
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
        await object2.initialize();

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        dispose();
    });

    it("Should start in alternate state", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(
                        user.state == PresenceState.away,
                        `user1: Unexpected presence state of ${user.state}`
                    );
                    assert(
                        user.data == undefined,
                        `user1: Unexpected data object of ${user.data}`
                    );
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize(undefined, PresenceState.away);

        const object2done = new Deferred();
        object2.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(
                        user.state == PresenceState.offline,
                        `user2: Unexpected presence state of ${user.state}`
                    );
                    assert(
                        user.data == undefined,
                        `user2: Unexpected data object of ${user.data}`
                    );
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.initialize(undefined, PresenceState.offline);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        dispose();
    });

    it("Should start with initial data", async () => {
        const { object1, object2, dispose } = await getObjects(
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
        await object1.initialize({ foo: "bar" }, PresenceState.away);
        assert(object1.state == PresenceState.away);
        assert(object1.data?.foo == "bar");

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
        await object2.initialize({ foo: "bar" }, PresenceState.offline);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        dispose();
    });

    it("Should update() user presence", async () => {
        const { object1, object2, dispose } = await getObjects(
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
                        assert(user.state == PresenceState.offline);
                        object1done.resolve();
                    } else {
                        triggered = true;
                        assert(
                            !user.data,
                            `user1: data object passed when it shouldn't be`
                        );
                        assert(user.state == PresenceState.online);
                    }
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.initialize();

        const object2Ready = new Deferred();
        object2.on("presenceChanged", (user, local) => {
            object2Ready.resolve();
        });
        await object2.initialize();

        // Wait for everything to start
        await object2Ready.promise;

        // Update presence
        object2.update({ foo: "bar" }, PresenceState.offline);

        // Wait for finish
        await object1done.promise;

        dispose();
    });

    it("Should enumerate users with forEach()", async () => {
        const { object1, object2, dispose } = await getObjects(
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
        await object1.initialize();
        await object2.initialize(undefined, PresenceState.away);

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

        dispose();
    });

    it("Should filter users by state using forEach()", async () => {
        const { object1, object2, dispose } = await getObjects(
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
        await object1.initialize();
        await object2.initialize(undefined, PresenceState.away);

        // Wait for ready and perform test
        let user1Found = false;
        let user2Found = false;
        await ready.promise;
        object1.getUsers(PresenceState.online).forEach((user) => {
            switch (user.userId) {
                case object1UserId:
                    user1Found = true;
                    break;
                case object2UserId:
                    user2Found = true;
                    break;
            }
        });

        assert(user1Found && !user2Found);

        dispose();
    });

    it("Should return members using getUsers()", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve();
            }
        });
        await object1.initialize();
        assert(
            object1.getUsers().length === 1,
            "getUsers() should not start empty"
        );
        await object2.initialize(undefined, PresenceState.away);

        // Wait for ready and perform test
        await ready.promise;
        const users = object1.getUsers();

        assert(Array.isArray(users), `getUsers() didn't return an array`);
        assert(users.length == 2, `Array has a length of ${users.length}`);

        dispose();
    });

    it("Should getCount() of the number of users being tracked", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve();
            }
        });
        await object1.initialize();
        await object2.initialize(undefined, PresenceState.away);

        // Wait for ready and perform test
        await ready.promise;
        const cnt = object1.getUsers().length;

        assert(cnt == 2);

        dispose();
    });

    it("Should filter getCount()", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve();
            }
        });
        await object1.initialize();
        await object2.initialize(undefined, PresenceState.away);

        // Wait for ready and perform test
        await ready.promise;
        const cnt = object1.getUsers(PresenceState.away).length;

        assert(cnt == 1);

        dispose();
    });

    it("Should getUser()", async () => {
        const { object1, object2, dispose } = await getObjects(
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
        await object1.initialize();
        await object2.initialize(undefined, PresenceState.away);

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

        dispose();
    });

    it("Should getPresenceForClient()", async () => {
        const { object1, object2, dispose } = await getObjects(
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
        await object1.initialize();
        await object2.initialize(undefined, PresenceState.away);

        // Wait for ready and get client ID's
        await ready.promise;

        assert(object1.clientId, "object1.clientId is undefined");
        assert(object2.clientId, "object2.clientId is undefined");
        assert(
            object1.clientId !== object2.clientId,
            "objects should not have the same clientId"
        );

        const users = object1.getUsers();
        assert(
            users.length === 2,
            "expected to have exactly 2 users in member list"
        );
        assert(
            users.filter((user) => user.userId === users[0].userId).length ===
                1,
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

        dispose();
    });

    it("Should send periodic presence updates", async () => {
        const { object1, object2, dispose } = await getObjects(
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
        await object1.initialize();

        object2.expirationPeriod = 0.2;
        await object2.initialize();

        // Wait for ready and then delay
        await ready.promise;
        await waitForDelay(600);

        // Delay for a few updates
        let count = 0;
        object1.getUsers().forEach((user) => {
            count++;
            assert(
                user.state == PresenceState.online,
                `user[${user.userId}] is ${user.state}`
            );
        });

        assert(count == 2, `Wrong number of users`);

        dispose();
    });

    it("isLocalUser should be true for both clients with same userId and contain both clientIds", async () => {
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
            setFluidContainerId(
                containerId: string
            ): Promise<IFluidContainerInfo> {
                return this.test.setFluidContainerId(containerId);
            }
            getNtpTime(): Promise<INtpTimeInfo> {
                return this.test.getNtpTime();
            }
            registerClientId(clientId: string): Promise<UserMeetingRole[]> {
                return this.test.registerClientId(clientId);
            }
            getClientRoles(
                clientId: string
            ): Promise<UserMeetingRole[] | undefined> {
                return this.test.getClientRoles(clientId);
            }
            async getClientInfo(
                clientId: string
            ): Promise<IClientInfo | undefined> {
                return this.test.getClientRoles(clientId).then((roles) => {
                    return {
                        userId: "user1",
                        roles: roles ?? [],
                        displayName: "user1",
                    };
                });
            }
        }

        // set same user test host
        const mockHost = new SameUserLiveShareTestHost();
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider,
            10000,
            mockHost
        );

        const object1done = new Deferred();
        object1.on("presenceChanged", async (user, local) => {
            try {
                assert(user != null, `user1: Null user arg`);
                assert(
                    user.state == PresenceState.online,
                    `user1: Unexpected presence state of ${user.state}`
                );
                assert(
                    user.data == undefined,
                    `user1: Unexpected data object of ${user.data}`
                );
                // If not local, we expect that isLocalUser will become true once we receive a message from the other client
                if (!local && !user.isLocalUser) {
                    await waitForDelay(10);
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
                    user.state == PresenceState.online,
                    `user1: Unexpected presence state of ${user.state}`
                );
                assert(
                    user.data == undefined,
                    `user1: Unexpected data object of ${user.data}`
                );
                // If not local, we expect that isLocalUser will become true once we receive a message from the other client
                if (!local && !user.isLocalUser) {
                    await waitForDelay(10);
                }
                assert(user.isLocalUser == true, `user1: should be local`);
                object2done.resolve();
            } catch (err) {
                object2done.reject(err);
            }
        });

        assert(!object1.isInitialized, `presence already initialized`);
        const init1 = object1.initialize();
        const init2 = object2.initialize();
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

        dispose();
    });
});
