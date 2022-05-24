/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { EphemeralPresence } from "../EphemeralPresence";
import { PresenceState } from "../EphemeralPresenceUser";
import { EphemeralObjectSynchronizer } from "../EphemeralObjectSynchronizer";
import { waitForDelay } from "../internals";
import { Deferred } from './Deferred';

describeNoCompat("EphemeralPresence", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    let object1: EphemeralPresence<{ foo: string }>;
    let object2: EphemeralPresence<{ foo: string }>;

    // Temporarily change update interval
    before(() => EphemeralObjectSynchronizer.updateInterval = 20);
    after(() => EphemeralObjectSynchronizer.updateInterval = 5000);

    beforeEach(async () => {
        provider = getTestObjectProvider();
        const container1 = await provider.createContainer(EphemeralPresence.factory);
        object1 = await requestFluidObject<EphemeralPresence<{ foo: string }>>(container1, "default");

        const container2 = await provider.loadContainer(EphemeralPresence.factory);
        object2 = await requestFluidObject<EphemeralPresence<{ foo: string }>>(container2, "default");

        // need to be connected to send signals
        if (!container1.connected) {
            await new Promise((resolve) => container1.once("connected", resolve));
        }
        if (!container2.connected) {
            await new Promise((resolve) => container2.once("connected", resolve));
        }
    });

    it("Should exchange initial presence information", async () => {
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            try {
                if (!local) {
                    assert(user != null, `user1: Null user arg`);
                    assert(user.userId == 'user2', `user1: Unexpected LOCAL userId: ${user.userId}`);
                    assert(user.state == PresenceState.online, `user1: Unexpected presence state of ${user.state}`);
                    assert(user.data == undefined, `user1: Unexpected data object of ${user.data}`);
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });

        assert(!object1.isStarted, `presence already started`);
        await object1.start('user1');
        assert(object1.isStarted, `presence not started`);

        const object2done = new Deferred();
        object2.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(user != null, `user2: Null user arg`);
                    assert(user.userId == 'user2', `user2: Unexpected REMOTE userId: ${user.userId}`);
                    assert(user.state == PresenceState.online, `user2: Unexpected presence state of ${user.state}`);
                    assert(user.data == undefined, `user2: Unexpected data object of ${user.data}`);
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.start('user2');

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should start in alternate state", async () => {
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(user.state == PresenceState.away, `user1: Unexpected presence state of ${user.state}`);
                    assert(user.data == undefined, `user1: Unexpected data object of ${user.data}`);
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.start('user1', undefined, PresenceState.away);

        const object2done = new Deferred();
        object2.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(user.state == PresenceState.offline, `user2: Unexpected presence state of ${user.state}`);
                    assert(user.data == undefined, `user2: Unexpected data object of ${user.data}`);
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.start('user2', undefined, PresenceState.offline);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should start with initial data", async () => {
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(user.data, `user1: NULL data`);
                    assert(user.data.foo == 'bar', `user1: Unexpected data object of ${user.data}`);
                    object1done.resolve();
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.start('user1', { foo: 'bar' }, PresenceState.away);
        assert(object1.userId == 'user1');
        assert(object1.state == PresenceState.away);
        assert(object1.data?.foo == 'bar');

        const object2done = new Deferred();
        object2.on("presenceChanged", (user, local) => {
            try {
                if (local) {
                    assert(user.data, `user2: NULL data`);
                    assert(user.data.foo == 'bar', `user2: Unexpected data object of ${user.data}`);
                    object2done.resolve();
                }
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.start('user2', { foo: 'bar'}, PresenceState.offline);

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should updatePresence()", async () => {
        let triggered = false;
        const object1done = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            try {
                if (!local) {
                    if (triggered) {
                        assert(user.data, `user1: NULL data`);
                        assert(user.data.foo == 'bar', `user1: Unexpected data object of ${user.data}`);
                        assert(user.state == PresenceState.offline);
                        object1done.resolve();
                    } else {
                        triggered = true;
                        assert(!user.data, `user1: data object passed`);
                        assert(user.state == PresenceState.online);
                    }
                }
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.start('user1');

        const object2Ready = new Deferred();
        object2.on("presenceChanged", (user, local) => {
            if (local) {
                object2Ready.resolve();
            }
        });
        await object2.start('user2');

        // Wait for everything to start
        await object2Ready.promise;

        // Update presence
        object2.updatePresence(PresenceState.offline, { foo: 'bar' })

        // Wait for finish
        await object1done.promise;
    });

    it("Should enumerate users with forEach()", async () => {
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve()
            }
        });
        await object1.start('user1');
        await object2.start('user2', undefined, PresenceState.away);

        // Wait for ready and perform test
        let user1Found = false;
        let user2Found = false;
        await ready.promise;
        object1.forEach((user) => {
            switch (user.userId) {
                case 'user1':
                    user1Found = true;
                    break;
                case 'user2':
                    user2Found = true;
                    break;
            }
        });

        assert(user1Found && user2Found);
    });

    it("Should filter users by state using forEach()", async () => {
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve()
            }
        });
        await object1.start('user1');
        await object2.start('user2', undefined, PresenceState.away);

        // Wait for ready and perform test
        let user1Found = false;
        let user2Found = false;
        await ready.promise;
        object1.forEach((user) => {
            switch (user.userId) {
                case 'user1':
                    user1Found = true;
                    break;
                case 'user2':
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
                ready.resolve()
            }
        });
        await object1.start('user1');
        await object2.start('user2', undefined, PresenceState.away);

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
                ready.resolve()
            }
        });
        await object1.start('user1');
        await object2.start('user2', undefined, PresenceState.away);

        // Wait for ready and perform test
        await ready.promise;
        const cnt = object1.getCount();

        assert(cnt == 2);
    });

    it("Should filter getCount()", async () => {
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve()
            }
        });
        await object1.start('user1');
        await object2.start('user2', undefined, PresenceState.away);

        // Wait for ready and perform test
        await ready.promise;
        const cnt = object1.getCount(PresenceState.away);

        assert(cnt == 1);
    });

    it("Should getPresenceForUser()", async () => {
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve()
            }
        });
        await object1.start('user1');
        await object2.start('user2', undefined, PresenceState.away);

        // Wait for ready and perform test
        await ready.promise;
        const user1 = object1.getPresenceForUser('user1');
        const user2 = object1.getPresenceForUser('user2');

        assert(user1 && user1.userId == 'user1', `user1: missing or wrong user returned`);
        assert(user1.isLocalUser, `user1: not local user`);
        assert(user2 && user2.userId == 'user2', `user2: missing or wrong user returned`);
        assert(!user2.isLocalUser, `user2: is local user`);
    });

    it("Should send periodic presence updates", async () => {
        const ready = new Deferred();
        object1.on("presenceChanged", (user, local) => {
            if (!local) {
                ready.resolve()
            }
        });
        object1.expirationPeriod = 0.2;
        await object1.start('user1');

        object2.expirationPeriod = 0.2;
        await object2.start('user2');

        // Wait for ready and then delay
        await ready.promise;
        await waitForDelay(600);

        // Delay for a few updates
        let count = 0;
        object1.forEach((user) => {
            count++;
            assert(user.state == PresenceState.online, `user[${user.userId}] is ${user.state}`);
        });

        assert(count == 2, `Wrong number of users`);
    });
});