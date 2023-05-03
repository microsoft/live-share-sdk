/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { LivePresence } from "../LivePresence";
import { PresenceState } from "../LivePresenceUser";
import { LiveObjectSynchronizer } from "../LiveObjectSynchronizer";
import { waitForDelay } from "../internals";
import { Deferred } from "./Deferred";
import { LiveShareClient } from "../LiveShareClient";
import {
    IClientInfo,
    IFluidContainerInfo,
    IFluidTenantInfo,
    ILiveShareHost,
    INtpTimeInfo,
    UserMeetingRole,
} from "../interfaces";
import { TestLiveShareHost } from "../TestLiveShareHost";

describeNoCompat("LivePresence", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    let object1: LivePresence<{ foo: string }>;
    let object2: LivePresence<{ foo: string }>;

    // Temporarily change update interval
    before(() => (LiveObjectSynchronizer.updateInterval = 20));
    after(() => (LiveObjectSynchronizer.updateInterval = 5000));

    beforeEach(async () => {
        provider = getTestObjectProvider();
        const container1 = await provider.createContainer(LivePresence.factory);
        object1 = await requestFluidObject<LivePresence<{ foo: string }>>(
            container1,
            "default"
        );

        const container2 = await provider.loadContainer(LivePresence.factory);
        object2 = await requestFluidObject<LivePresence<{ foo: string }>>(
            container2,
            "default"
        );

        // need to be connected to send signals
        if (!(container1 as any).connected) {
            await new Promise((resolve) =>
                container1.once("connected", resolve)
            );
        }
        if (!(container1 as any).connected) {
            await new Promise((resolve) =>
                container2.once("connected", resolve)
            );
        }
    });

    it("Should exchange initial presence information", async () => {
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
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
                if (local) {
                    assert(user != null, `user2: Null user arg`);
                    assert(
                        user.state == PresenceState.online,
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
        await object2.initialize();

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should start in alternate state", async () => {
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
    });

    it("Should start with initial data", async () => {
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(user.data, `user1: NULL data`);
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
                if (local) {
                    assert(user.data, `user2: NULL data`);
                    assert(
                        user.data.foo == "bar",
                        `user2: Unexpected data object of ${user.data}`
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
    });

    it("Should update() user presence", async () => {
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
            if (local) {
                object2Ready.resolve();
            }
        });
        await object2.initialize();

        // Wait for everything to start
        await object2Ready.promise;

        // Update presence
        object2.update({ foo: "bar" }, PresenceState.offline);

        // Wait for finish
        await object1done.promise;
    });

    it("Should enumerate users with forEach()", async () => {
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
        let user1Found = false;
        let user2Found = false;
        await ready.promise;
        object1.forEach((user) => {
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
    });

    it("Should filter users by state using forEach()", async () => {
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
        let user1Found = false;
        let user2Found = false;
        await ready.promise;
        object1.forEach((user) => {
            switch (user.userId) {
                case object1UserId:
                    user1Found = true;
                    break;
                case object2UserId:
                    user2Found = true;
                    break;
            }
        }, PresenceState.online);

        assert(user1Found && !user2Found);
    });

    it("Should return members using toArray()", async () => {
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
        const users = object1.toArray();

        assert(Array.isArray(users), `toArray() didn't return an array`);
        assert(users.length == 2, `Array has a length of ${users.length}`);
    });

    it("Should getCount() of the number of users being tracked", async () => {
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
        const cnt = object1.getCount();

        assert(cnt == 2);
    });

    it("Should filter getCount()", async () => {
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
        const cnt = object1.getCount(PresenceState.away);

        assert(cnt == 1);
    });

    it("Should getPresenceForUser()", async () => {
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
        const user1 = object1.getPresenceForUser(object1UserId);
        const user2 = object1.getPresenceForUser(object2UserId);

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
    });

    it("Should getPresenceForClient()", async () => {
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

        // Wait for ready and get client ID's
        await ready.promise;
        const client1 = (object1 as any)._currentPresence.clientId;
        const client2 = (object2 as any)._currentPresence.clientId;

        // Perform test
        const user1 = object1.getPresenceForClient(client1);
        const user2 = object1.getPresenceForClient(client2);

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
    });

    it("Should send periodic presence updates", async () => {
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
        object1.forEach((user) => {
            count++;
            assert(
                user.state == PresenceState.online,
                `user[${user.userId}] is ${user.state}`
            );
        });

        assert(count == 2, `Wrong number of users`);
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
            getClientInfo(clientId: string): Promise<IClientInfo | undefined> {
                return this.test.getClientRoles(clientId).then((roles) => {
                    return {
                        userId: "user1",
                        roles: roles,
                        displayName: "user1",
                    } as IClientInfo;
                });
            }
        }

        // set same user test host
        new LiveShareClient(new SameUserLiveShareTestHost());

        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
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
                assert(user.isLocalUser == true, `user1: should be local`);
                object1done.resolve();
            } catch (err) {
                object1done.reject(err);
            }
        });

        const object2done = new Deferred();
        object2.on("presenceChanged", (user, local) => {
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
                assert(user.isLocalUser == true, `user1: should be local`);
                object2done.resolve();
            } catch (err) {
                object2done.reject(err);
            }
        });

        assert(!object1.isInitialized, `presence already initialized`);
        await object1.initialize();
        assert(object1.isInitialized, `presence not initialized`);
        await object2.initialize();

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);

        // cannot check for new clients on same user in `presenceChanged` callback, will evaluate as being equal.
        // wait for a sync to happen, and check for new clients with getPresenceForUser
        await waitForDelay(50);
        assert(
            object1.getPresenceForUser("user1")?._clients.length == 2,
            "user should have two clients"
        );
        assert(
            object2.getPresenceForUser("user1")?._clients.length == 2,
            "user should have two clients"
        );

        // reset to normal TestLiveShareHost
        new LiveShareClient(TestLiveShareHost.create());
    });
});
