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
import {
    FollowModeType,
    IFollowModePresenceUserData,
    IFollowModeState,
    LiveFollowMode,
} from "../LiveFollowMode.js";
import { getLiveDataObjectKind } from "../internals/schema-injection-utils.js";
import { MockLiveShareRuntime } from "../internals/mock/MockLiveShareRuntime.js";
import { LivePresenceUser } from "../LivePresenceUser.js";
import {
    describeCompat,
    ITestObjectProviderOptions,
} from "@live-share-private/test-utils";
import { waitForDelay } from "../internals/utils.js";
import { Deferred } from "../internals/Deferred.js";

interface TestFollowData {
    page: string;
}

async function getObjects(
    getTestObjectProvider: (
        options?: ITestObjectProviderOptions
    ) => ITestObjectProvider
) {
    // Temporarily change update interval
    let liveRuntime1 = new MockLiveShareRuntime(false);
    let liveRuntime2 = new MockLiveShareRuntime(false);

    let ObjectProxy1: any = getLiveDataObjectKind<
        LiveFollowMode<TestFollowData>
    >(LiveFollowMode, liveRuntime1);
    let ObjectProxy2: any = getLiveDataObjectKind<
        LiveFollowMode<TestFollowData>
    >(LiveFollowMode, liveRuntime2);

    await liveRuntime1.start();
    await liveRuntime2.start();

    let provider: ITestObjectProvider = getTestObjectProvider();

    let container1 = await provider.createContainer(
        ObjectProxy1.factory as fluidEntryPoint
    );
    let object1 =
        await getContainerEntryPointBackCompat<LiveFollowMode>(container1);

    let container2 = await provider.loadContainer(
        ObjectProxy2.factory as fluidEntryPoint
    );
    let object2 =
        await getContainerEntryPointBackCompat<LiveFollowMode>(container2);

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

const mockDefaultValue: TestFollowData = {
    page: "foo",
};

describeCompat(
    "LiveFollowMode",
    (
        getTestObjectProvider: (
            options?: ITestObjectProviderOptions
        ) => ITestObjectProvider
    ) => {
        it("Should initialize with correct defaults", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            let init1 = object1.initialize(mockDefaultValue);
            let init2 = object2.initialize(mockDefaultValue);

            await Promise.all([init1, init2]);

            function assertDefaultValues() {
                // state should be defined
                assert(
                    object1.state !== undefined,
                    "object1.state should be defined"
                );
                assert(
                    object2.state !== undefined,
                    "object2.state should be defined"
                );

                // local user should be defined
                assert(
                    object1.localUser !== undefined,
                    "object1.localUser should be defined"
                );
                assert(
                    object2.localUser !== undefined,
                    "object2.localUser should be defined"
                );

                // local user should be following themselves to start
                assert(
                    object1.state.followingUserId === object1.localUser.userId,
                    "object1 state should show followingUserId is equal to local user's id"
                );
                assert(
                    object2.state.followingUserId === object2.localUser.userId,
                    "object2 state should show followingUserId is equal to local user's id"
                );

                // state.type should be local
                assert(
                    object1.state.type === FollowModeType.local,
                    `object1.state.type should be local, instead is ${object1.state.type}`
                );
                assert(
                    object2.state.type === FollowModeType.local,
                    `object2.state.type should be local, instead is ${object2.state.type}`
                );

                // state.isLocalValue should be true
                assert(
                    object1.state.isLocalValue === true,
                    `object1.state.isLocalValue should be true`
                );
                assert(
                    object2.state.type === FollowModeType.local,
                    `object1.state.isLocalValue should be true`
                );

                // state.otherUsersCount should be 0
                assert(
                    object1.state.otherUsersCount === 0,
                    `object1.state.otherUsersCount should be 0, instead is ${object1.state.otherUsersCount}`
                );
                assert(
                    object2.state.otherUsersCount === 0,
                    `object2.state.otherUsersCount should be 0, instead is ${object2.state.otherUsersCount}`
                );

                // state.value.page should be equal to mockDefaultValue.page
                assert(
                    object1.state.value.page === mockDefaultValue.page,
                    `object1.state.value.page should be ${mockDefaultValue.page}, instead is ${object1.state.value.page}`
                );
                assert(
                    object2.state.value.page === mockDefaultValue.page,
                    `object2.state.value.page should be ${mockDefaultValue.page}, instead is ${object2.state.value.page}`
                );
            }
            assertDefaultValues();

            await waitForDelay(60);
            // default values should remain unchanged once initial presence update is sent
            assertDefaultValues();

            const users1 = object1.getUsers();
            const users2 = object2.getUsers();
            const nonLocalUser1 = users1.find((u) => !u.isLocalUser);
            const nonLocalUser2 = users2.find((u) => !u.isLocalUser);

            // users should have correct length
            assert(
                users1.length === 2,
                `users1.length should be 2, instead is ${users1.length}`
            );
            assert(
                users2.length === 2,
                `users2.length should be 2, instead is ${users2.length}`
            );
            // users should contain non-local user
            assert(
                nonLocalUser1 !== undefined,
                "nonLocalUser1 should be defined"
            );
            assert(
                nonLocalUser2 !== undefined,
                "nonLocalUser2 should be defined"
            );
            // non-local user data should be defined
            assert(
                nonLocalUser1.data !== undefined,
                "nonLocalUser1.data should be defined"
            );
            assert(
                nonLocalUser2.data !== undefined,
                "nonLocalUser2.data should be defined"
            );
            // non-local user should have correct default values
            assert(
                nonLocalUser1.data.stateValue.page === mockDefaultValue.page,
                `nonLocalUser1.data.stateValue.page should be ${mockDefaultValue.page}, instead is ${nonLocalUser1.data.stateValue.page}`
            );
            assert(
                nonLocalUser2.data.stateValue.page === mockDefaultValue.page,
                `nonLocalUser2.data.stateValue.page should be ${mockDefaultValue.page}, instead is ${nonLocalUser2.data.stateValue.page}`
            );

            dispose();
        });

        it("Should correctly broadcast local user's state value", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            let init1 = object1.initialize(mockDefaultValue);
            let init2 = object2.initialize(mockDefaultValue);

            await Promise.all([init1, init2]);

            // allow remote presence to be received to make the test a bit cleaner
            await waitForDelay(0);

            const user1StateValue = {
                page: "bananas",
            };
            const user2StateValue = {
                page: "apples",
            };

            const object1StateDone = new Deferred();
            object1.on("stateChanged", (state, local) => {
                assert(
                    local,
                    "object1: should not receive non-local stateChanged event"
                );
                assert(
                    state.isLocalValue,
                    "object1: state should be isLocalValue true"
                );
                assert(
                    state.type === FollowModeType.local,
                    "object1: state should be type of local"
                );
                assert(
                    state.followingUserId === object1.localUser!.userId,
                    `object1: state should have followingUserId equal to local user, instead is ${state.followingUserId}`
                );
                assert(
                    state.otherUsersCount === 0,
                    `object1: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
                );
                assert(
                    state.value.page === user1StateValue.page,
                    `object1: state should have value.page equal to ${user1StateValue.page}, instead is ${state.value.page}`
                );
                object1StateDone.resolve();
            });
            const object1PresenceDone = new Deferred();
            let numPresence1Updates = 0;
            object1.on("presenceChanged", (presence, local) => {
                assert(
                    presence.data !== undefined,
                    "object1: presence.data should not be undefined"
                );
                if (local) {
                    assert(
                        presence.data.stateValue.page === user1StateValue.page,
                        `object1: local presence should have data.page of ${user1StateValue.page}, instead is ${presence.data.stateValue.page}`
                    );
                } else {
                    assert(
                        presence.data.stateValue.page === user2StateValue.page,
                        `object1: non-local presence should have data.page of ${user2StateValue.page}, instead is ${presence.data.stateValue.page}`
                    );
                }
                numPresence1Updates += 1;
                if (numPresence1Updates === 2) {
                    object1PresenceDone.resolve();
                }
            });

            const object2StateDone = new Deferred();
            object2.on("stateChanged", (state, local) => {
                assert(
                    local,
                    "object2: should not receive non-local stateChanged event"
                );
                assert(
                    state.isLocalValue,
                    "object2: state should be isLocalValue true"
                );
                assert(
                    state.type === FollowModeType.local,
                    "object2: state should be type of local"
                );
                assert(
                    state.followingUserId === object2.localUser!.userId,
                    `object2: state should have followingUserId equal to local user, instead is ${state.followingUserId}`
                );
                assert(
                    state.otherUsersCount === 0,
                    `object2: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
                );
                assert(
                    state.value.page === user2StateValue.page,
                    `object2: state should have value.page equal to ${user2StateValue.page}, instead is ${state.value.page}`
                );
                object1StateDone.resolve();
            });
            const object2PresenceDone = new Deferred();
            let numPresence2Updates = 0;
            object2.on("presenceChanged", (presence, local) => {
                assert(
                    presence.data !== undefined,
                    "object2: presence.data should not be undefined"
                );
                if (local) {
                    assert(
                        presence.data.stateValue.page === user2StateValue.page,
                        `object2: local presence should have data.page of ${user2StateValue.page}, instead is ${presence.data.stateValue.page}`
                    );
                } else {
                    assert(
                        presence.data.stateValue.page === user1StateValue.page,
                        `object2: non-local presence should have data.page of ${user1StateValue.page}, instead is ${presence.data.stateValue.page}`
                    );
                }
                numPresence2Updates += 1;
                if (numPresence2Updates === 2) {
                    object1PresenceDone.resolve();
                }
            });

            const update1 = object1.update(user1StateValue);
            const update2 = object2.update(user2StateValue);
            await Promise.all([update1, update2]);
            await Promise.all([
                object1StateDone,
                object1PresenceDone,
                object2StateDone,
                object2PresenceDone,
            ]);

            dispose();
        });

        it("Should be able to start/stop presenting", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            const user1StateValue = {
                page: "bananas",
            };
            const user2StateValue = {
                page: "apples",
            };
            let init1 = object1.initialize(user1StateValue);
            let init2 = object2.initialize(user2StateValue);

            await Promise.all([init1, init2]);

            // allow remote presence to be received to make the test a bit cleaner
            await waitForDelay(0);

            // Validate that object1 can become the presenter
            await validateStartPresenting(object1, object2);
            // Validate that object2 can take over as the presenter
            await validateStartPresenting(object2, object1);

            // object2 will now be in control, validate stopPresenting
            await validateStopPresenting(object2, object1);

            dispose();
        });

        it("Should be able to start/stop suspension from presenter", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            const user1StateValue = {
                page: "bananas",
            };
            const user2StateValue = {
                page: "apples",
            };
            let init1 = object1.initialize(user1StateValue);
            let init2 = object2.initialize(user2StateValue);

            await Promise.all([init1, init2]);

            // allow remote presence to be received to make the test a bit cleaner
            await waitForDelay(0);

            // Validate that object1 can become the presenter
            await validateStartPresenting(object1, object2);

            // Validate that object2 can suspend
            await validateStartSuspensionPresenter(object1, object2);
            // Validate that object2 can stop suspension
            await validateEndSuspensionPresenter(object1, object2);

            dispose();
        });

        it("Should be able to start/stop following", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            const user1StateValue = {
                page: "bananas",
            };
            const user2StateValue = {
                page: "apples",
            };
            let init1 = object1.initialize(user1StateValue);
            let init2 = object2.initialize(user2StateValue);

            await Promise.all([init1, init2]);

            // allow remote presence to be received to make the test a bit cleaner
            await waitForDelay(0);

            // Validate that object1 can follow object2
            await validateStartFollowing(object1, object2);
            // Validate that object1 can stop following object2
            await validateStopFollowing(object1, object2);
            // Validate that object2 can follow object1
            await validateStartFollowing(object2, object1);
            // Validate that object2 can stop following object1
            await validateStopFollowing(object2, object1);

            dispose();
        });

        it("Should be able to start/end suspension while following", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            const user1StateValue = {
                page: "bananas",
            };
            const user2StateValue = {
                page: "apples",
            };
            let init1 = object1.initialize(user1StateValue);
            let init2 = object2.initialize(user2StateValue);

            await Promise.all([init1, init2]);

            // allow remote presence to be received to make the test a bit cleaner
            await waitForDelay(0);

            // Validate that object1 can follow object2
            await validateStartFollowing(object1, object2);
            // Validate that object1 can suspend from following object 2
            await validateStartSuspensionFollower(object1, object2);
            // Validate that object1 can end suspension from following object 2
            await validateEndSuspensionFollower(object1, object2);

            dispose();
        });

        it("Presenting should override following specific user", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            const user1StateValue = {
                page: "bananas",
            };
            const user2StateValue = {
                page: "apples",
            };
            let init1 = object1.initialize(user1StateValue);
            let init2 = object2.initialize(user2StateValue);

            await Promise.all([init1, init2]);

            // allow remote presence to be received to make the test a bit cleaner
            await waitForDelay(0);

            // Validate that object1 can follow object2
            await validateStartFollowing(object1, object2);
            // Validate that object1 can start presenting
            await validateStartPresenting(object1, object2);

            dispose();
        });
    }
);

async function validateStartPresenting(
    objectToPresent: LiveFollowMode<TestFollowData>,
    otherObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const objectToPresentStateDone = new Deferred();
    const objectToPresentStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local,
            "objectToPresent: should not receive non-local stateChanged event"
        );
        assert(
            state.isLocalValue,
            "objectToPresent: state should be isLocalValue true"
        );
        assert(
            state.type === FollowModeType.activePresenter,
            "objectToPresent: state should be type of activePresenter"
        );
        assert(
            state.followingUserId === objectToPresent.localUser!.userId,
            `objectToPresent: state should have followingUserId equal to local user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 1,
            `objectToPresent: state should have otherUsersCount equal to 1, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                objectToPresent.localUser!.data?.stateValue.page,
            `objectToPresent: state should have value.page equal to ${
                objectToPresent.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        objectToPresentStateDone.resolve();
    };
    objectToPresent.on("stateChanged", objectToPresentStateChangedHandler);
    const objectToPresentPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "objectToPresent: no presence update should occur");
    };
    objectToPresent.on(
        "presenceChanged",
        objectToPresentPresenceChangedHandler
    );

    const otherObjectStateDone = new Deferred();
    const otherObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        const users = otherObject.getUsers();
        const nonLocalUser = users.find((u) => !u.isLocalUser);
        assert(
            local == false,
            "otherObject: should not receive local stateChanged event"
        );
        assert(
            state.isLocalValue == false,
            "otherObject: state should be isLocalValue false"
        );
        assert(
            state.type === FollowModeType.followPresenter,
            "otherObject: state should be type of followPresenter"
        );
        assert(
            state.followingUserId === nonLocalUser!.userId,
            `otherObject: state should have followingUserId equal to nonLocalUser.userId, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `otherObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page === nonLocalUser!.data?.stateValue.page,
            `otherObject: state should have value.page equal to ${
                nonLocalUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        otherObjectStateDone.resolve();
    };
    otherObject.on("stateChanged", otherObjectStateChangedHandler);
    const otherObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "otherObject: no presence update should occur");
    };
    otherObject.on("presenceChanged", otherObjectPresenceChangedHandler);

    await objectToPresent.startPresenting();
    await Promise.all([
        objectToPresentStateDone.promise,
        otherObjectStateDone.promise,
    ]);
    objectToPresent.off("stateChanged", objectToPresentStateChangedHandler);
    objectToPresent.off(
        "presenceChanged",
        objectToPresentPresenceChangedHandler
    );
    otherObject.off("stateChanged", otherObjectStateChangedHandler);
    otherObject.off("presenceChanged", otherObjectPresenceChangedHandler);
}

async function validateStopPresenting(
    presentingObject: LiveFollowMode<TestFollowData>,
    otherObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const presentingObjectStateDone = new Deferred();
    const presentingObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local,
            "presentingObject: should not receive non-local stateChanged event"
        );
        assert(
            state.isLocalValue,
            "presentingObject: state should be isLocalValue true"
        );
        assert(
            state.type === FollowModeType.local,
            "presentingObject: state should be type of local"
        );
        assert(
            state.followingUserId === presentingObject.localUser!.userId,
            `presentingObject: state should have followingUserId equal to local user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `presentingObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                presentingObject.localUser!.data?.stateValue.page,
            `presentingObject: state should have value.page equal to ${
                presentingObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        presentingObjectStateDone.resolve();
    };
    presentingObject.on("stateChanged", presentingObjectStateChangedHandler);
    const presentingObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "presentingObject: no presence update should occur");
    };
    presentingObject.on(
        "presenceChanged",
        presentingObjectPresenceChangedHandler
    );

    const otherObjectStateDone = new Deferred();
    const otherObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local == false,
            "otherObject: should receive non-local stateChanged event"
        );
        assert(
            state.isLocalValue,
            "otherObject: state should be isLocalValue true"
        );
        assert(
            state.type === FollowModeType.local,
            "otherObject: state should be type of local"
        );
        assert(
            state.followingUserId === otherObject.localUser!.userId,
            `otherObject: state should have followingUserId equal to local user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `otherObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page === otherObject.localUser!.data?.stateValue.page,
            `otherObject: state should have value.page equal to ${
                otherObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        otherObjectStateDone.resolve();
    };
    otherObject.on("stateChanged", otherObjectStateChangedHandler);
    const otherObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "otherObject: no presence update should occur");
    };
    otherObject.on("presenceChanged", otherObjectPresenceChangedHandler);

    await presentingObject.stopPresenting();
    await Promise.all([
        presentingObjectStateDone.promise,
        otherObjectStateDone.promise,
    ]);
    presentingObject.off("stateChanged", presentingObjectStateChangedHandler);
    presentingObject.off(
        "presenceChanged",
        presentingObjectPresenceChangedHandler
    );
    otherObject.off("stateChanged", otherObjectStateChangedHandler);
    otherObject.off("presenceChanged", otherObjectPresenceChangedHandler);
}

async function validateStartSuspensionPresenter(
    presentingObject: LiveFollowMode<TestFollowData>,
    otherObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const presentingObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            false,
            "presentingObject: no state update should occur for presenter"
        );
    };
    presentingObject.on("stateChanged", presentingObjectStateChangedHandler);
    const presentingObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "presentingObject: no presence update should occur");
    };
    presentingObject.on(
        "presenceChanged",
        presentingObjectPresenceChangedHandler
    );

    const otherObjectStateDone = new Deferred();
    const otherObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local == true,
            "otherObject: should receive local stateChanged event"
        );
        assert(
            state.isLocalValue,
            "otherObject: state should be isLocalValue true"
        );
        assert(
            state.type === FollowModeType.suspendFollowPresenter,
            `otherObject: state should be type of suspendFollowPresenter, instead is ${state.type}`
        );
        assert(
            state.followingUserId === presentingObject.localUser!.userId,
            `otherObject: state should have followingUserId equal to remote user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `otherObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page === otherObject.localUser!.data?.stateValue.page,
            `otherObject: state should have value.page equal to ${
                otherObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        otherObjectStateDone.resolve();
    };
    otherObject.on("stateChanged", otherObjectStateChangedHandler);
    const otherObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "otherObject: no presence update should occur");
    };
    otherObject.on("presenceChanged", otherObjectPresenceChangedHandler);

    await otherObject.beginSuspension();
    await otherObjectStateDone.promise;
    presentingObject.off("stateChanged", presentingObjectStateChangedHandler);
    presentingObject.off(
        "presenceChanged",
        presentingObjectPresenceChangedHandler
    );
    otherObject.off("stateChanged", otherObjectStateChangedHandler);
    otherObject.off("presenceChanged", otherObjectPresenceChangedHandler);
}

async function validateEndSuspensionPresenter(
    presentingObject: LiveFollowMode<TestFollowData>,
    otherObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const presentingObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            false,
            "presentingObject: no state update should occur for presenter"
        );
    };
    presentingObject.on("stateChanged", presentingObjectStateChangedHandler);
    const presentingObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "presentingObject: no presence update should occur");
    };
    presentingObject.on(
        "presenceChanged",
        presentingObjectPresenceChangedHandler
    );

    const otherObjectStateDone = new Deferred();
    const otherObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local == true,
            "otherObject: should receive local stateChanged event"
        );
        assert(
            state.isLocalValue == false,
            "otherObject: state should be isLocalValue false"
        );
        assert(
            state.type === FollowModeType.followPresenter,
            `otherObject: state should be type of followPresenter, instead is ${state.type}`
        );
        assert(
            state.followingUserId === presentingObject.localUser!.userId,
            `otherObject: state should have followingUserId equal to remote user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `otherObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                presentingObject.localUser!.data?.stateValue.page,
            `otherObject: state should have value.page equal to ${
                presentingObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        otherObjectStateDone.resolve();
    };
    otherObject.on("stateChanged", otherObjectStateChangedHandler);
    const otherObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "otherObject: no presence update should occur");
    };
    otherObject.on("presenceChanged", otherObjectPresenceChangedHandler);

    await otherObject.endSuspension();
    await otherObjectStateDone.promise;
    presentingObject.off("stateChanged", presentingObjectStateChangedHandler);
    presentingObject.off(
        "presenceChanged",
        presentingObjectPresenceChangedHandler
    );
    otherObject.off("stateChanged", otherObjectStateChangedHandler);
    otherObject.off("presenceChanged", otherObjectPresenceChangedHandler);
}

async function validateStartFollowing(
    followingObject: LiveFollowMode<TestFollowData>,
    followedObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const followingObjectStateDone = new Deferred();
    const followingObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local,
            "followingObject: should receive local stateChanged event"
        );
        assert(
            state.isLocalValue == false,
            "followingObject: state should be isLocalValue false"
        );
        assert(
            state.type === FollowModeType.followUser,
            "followingObject: state should be type of followUser"
        );
        assert(
            state.followingUserId === followedObject.localUser!.userId,
            `followingObject: state should have followingUserId equal to remote user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `followingObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                followedObject.localUser!.data?.stateValue.page,
            `followingObject: state should have value.page equal to ${
                followedObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        followingObjectStateDone.resolve();
    };
    const followingObjectPresenceDone = new Deferred();
    followingObject.on("stateChanged", followingObjectStateChangedHandler);
    const followingObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(
            local,
            "followingObject: should receive local presenceChanged event"
        );
        assert(
            presence.data != undefined,
            "followingObject: presence.data should not be undefined"
        );
        assert(
            presence.data.followingUserId === followedObject.localUser!.userId,
            `followingObject: presence.data.followingUserId should be ${
                followedObject.localUser!.userId
            }, instead is ${presence.data.followingUserId}`
        );
        assert(
            presence.data.stateValue.page ===
                followingObject.localUser!.data!.stateValue.page,
            `followingObject: presence.data.stateValue.page should be ${
                followingObject.localUser!.data!.stateValue.page
            }, instead is ${presence.data.stateValue.page}`
        );
        followingObjectPresenceDone.resolve();
    };
    followingObject.on(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );

    const followedObjectStateDone = new Deferred();
    const followedObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        const users = followedObject.getUsers();
        const nonLocalUser = users.find((u) => !u.isLocalUser);
        assert(
            local == false,
            "followedObject: should not receive local stateChanged event"
        );
        assert(
            state.isLocalValue == true,
            "followedObject: state should be isLocalValue false"
        );
        assert(
            state.type === FollowModeType.activeFollowers,
            "followedObject: state should be type of activeFollowers"
        );
        assert(
            state.followingUserId === followedObject.localUser!.userId,
            `followedObject: state should have followingUserId equal to nonLocalUser.userId, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 1,
            `followedObject: state should have otherUsersCount equal to 1, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                followedObject.localUser!.data?.stateValue.page,
            `followedObject: state should have value.page equal to ${
                followedObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        followedObjectStateDone.resolve();
    };
    const followedObjectPresenceDone = new Deferred();
    followedObject.on("stateChanged", followedObjectStateChangedHandler);
    const followedObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(
            local == false,
            "followedObject: should receive non-local presenceChanged event"
        );
        assert(
            presence.data != undefined,
            "followedObject: presence.data should not be undefined"
        );
        assert(
            presence.data.followingUserId === followedObject.localUser!.userId,
            `followedObject: presence.data.followingUserId should be ${
                followedObject.localUser!.userId
            }, instead is ${presence.data.followingUserId}`
        );
        assert(
            presence.data.stateValue.page ===
                followingObject.localUser!.data!.stateValue.page,
            `followedObject: presence.data.stateValue.page should be ${
                followingObject.localUser!.data!.stateValue.page
            }, instead is ${presence.data.stateValue.page}`
        );
        followedObjectPresenceDone.resolve();
    };
    followedObject.on("presenceChanged", followedObjectPresenceChangedHandler);

    await followingObject.followUser(followedObject.localUser!.userId);
    await Promise.all([
        followingObjectStateDone.promise,
        followingObjectPresenceDone.promise,
        followedObjectStateDone.promise,
        followedObjectPresenceDone.promise,
    ]);
    followingObject.off("stateChanged", followingObjectStateChangedHandler);
    followingObject.off(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );
    followedObject.off("stateChanged", followedObjectStateChangedHandler);
    followedObject.off("presenceChanged", followedObjectPresenceChangedHandler);
}

async function validateStopFollowing(
    followingObject: LiveFollowMode<TestFollowData>,
    followedObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const followingObjectStateDone = new Deferred();
    const followingObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local,
            "followingObject: should receive local stateChanged event"
        );
        assert(
            state.isLocalValue == true,
            "followingObject: state should be isLocalValue false"
        );
        assert(
            state.type === FollowModeType.local,
            "followingObject: state should be type of local"
        );
        assert(
            state.followingUserId === followingObject.localUser!.userId,
            `followingObject: state should have followingUserId equal to local user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `followingObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                followingObject.localUser!.data?.stateValue.page,
            `followingObject: state should have value.page equal to ${
                followingObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        followingObjectStateDone.resolve();
    };
    const followingObjectPresenceDone = new Deferred();
    followingObject.on("stateChanged", followingObjectStateChangedHandler);
    const followingObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(
            local,
            "followingObject: should receive local presenceChanged event"
        );
        assert(
            presence.data != undefined,
            "followingObject: presence.data should not be undefined"
        );
        assert(
            presence.data.followingUserId === undefined,
            `followingObject: presence.data.followingUserId should be undefined, instead is ${presence.data.followingUserId}`
        );
        assert(
            presence.data.stateValue.page ===
                followingObject.localUser!.data!.stateValue.page,
            `followingObject: presence.data.stateValue.page should be ${
                followingObject.localUser!.data!.stateValue.page
            }, instead is ${presence.data.stateValue.page}`
        );
        followingObjectPresenceDone.resolve();
    };
    followingObject.on(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );

    const followedObjectStateDone = new Deferred();
    const followedObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local == false,
            "followedObject: should not receive local stateChanged event"
        );
        assert(
            state.isLocalValue == true,
            "followedObject: state should be isLocalValue false"
        );
        assert(
            state.type === FollowModeType.local,
            "followedObject: state should be type of local"
        );
        assert(
            state.followingUserId === followedObject.localUser!.userId,
            `followedObject: state should have followingUserId equal to nonLocalUser.userId, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `followedObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                followedObject.localUser!.data?.stateValue.page,
            `followedObject: state should have value.page equal to ${
                followedObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        followedObjectStateDone.resolve();
    };
    const followedObjectPresenceDone = new Deferred();
    followedObject.on("stateChanged", followedObjectStateChangedHandler);
    const followedObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(
            local == false,
            "followedObject: should receive non-local presenceChanged event"
        );
        assert(
            presence.data != undefined,
            "followedObject: presence.data should not be undefined"
        );
        assert(
            presence.data.followingUserId === undefined,
            `followedObject: presence.data.followingUserId should be undefined, instead is ${presence.data.followingUserId}`
        );
        assert(
            presence.data.stateValue.page ===
                followingObject.localUser!.data!.stateValue.page,
            `followedObject: presence.data.stateValue.page should be ${
                followingObject.localUser!.data!.stateValue.page
            }, instead is ${presence.data.stateValue.page}`
        );
        followedObjectPresenceDone.resolve();
    };
    followedObject.on("presenceChanged", followedObjectPresenceChangedHandler);

    await followingObject.stopFollowing();
    await Promise.all([
        followingObjectStateDone.promise,
        followingObjectPresenceDone.promise,
        followedObjectStateDone.promise,
        followedObjectPresenceDone.promise,
    ]);
    followingObject.off("stateChanged", followingObjectStateChangedHandler);
    followingObject.off(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );
    followedObject.off("stateChanged", followedObjectStateChangedHandler);
    followedObject.off("presenceChanged", followedObjectPresenceChangedHandler);
}

async function validateStartSuspensionFollower(
    followingObject: LiveFollowMode<TestFollowData>,
    followedObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const followingObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local == true,
            "followingObject: should receive local stateChanged event"
        );
        assert(
            state.isLocalValue,
            "followingObject: state should be isLocalValue true"
        );
        assert(
            state.type === FollowModeType.suspendFollowUser,
            `followingObject: state should be type of suspendFollowUser, instead is ${state.type}`
        );
        assert(
            state.followingUserId === followedObject.localUser!.userId,
            `followingObject: state should have followingUserId equal to remote user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `followingObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                followingObject.localUser!.data?.stateValue.page,
            `followingObject: state should have value.page equal to ${
                followingObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        followedObjectStateDone.resolve();
    };
    followingObject.on("stateChanged", followingObjectStateChangedHandler);
    const followingObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "followingObject: no presence update should occur");
    };
    followingObject.on(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );

    const followedObjectStateDone = new Deferred();
    const followedObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            false,
            "followedObject: no state update should occur for presenter"
        );
    };
    followedObject.on("stateChanged", followedObjectStateChangedHandler);
    const followedObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "followedObject: no presence update should occur");
    };
    followedObject.on("presenceChanged", followedObjectPresenceChangedHandler);

    await followingObject.beginSuspension();
    await followedObjectStateDone.promise;
    followingObject.off("stateChanged", followingObjectStateChangedHandler);
    followingObject.off(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );
    followedObject.off("stateChanged", followedObjectStateChangedHandler);
    followedObject.off("presenceChanged", followedObjectPresenceChangedHandler);
}

async function validateEndSuspensionFollower(
    followingObject: LiveFollowMode<TestFollowData>,
    followedObject: LiveFollowMode<TestFollowData>
): Promise<void> {
    const followingObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            local == true,
            "followingObject: should receive local stateChanged event"
        );
        assert(
            state.isLocalValue == false,
            "followingObject: state should be isLocalValue false"
        );
        assert(
            state.type === FollowModeType.followUser,
            `followingObject: state should be type of followUser, instead is ${state.type}`
        );
        assert(
            state.followingUserId === followedObject.localUser!.userId,
            `followingObject: state should have followingUserId equal to remote user, instead is ${state.followingUserId}`
        );
        assert(
            state.otherUsersCount === 0,
            `followingObject: state should have otherUsersCount equal to 0, instead is ${state.otherUsersCount}`
        );
        assert(
            state.value.page ===
                followedObject.localUser!.data?.stateValue.page,
            `followingObject: state should have value.page equal to ${
                followedObject.localUser!.data?.stateValue.page
            }, instead is ${state.value.page}`
        );
        followedObjectStateDone.resolve();
    };
    followingObject.on("stateChanged", followingObjectStateChangedHandler);
    const followingObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "followingObject: no presence update should occur");
    };
    followingObject.on(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );

    const followedObjectStateDone = new Deferred();
    const followedObjectStateChangedHandler = (
        state: IFollowModeState<TestFollowData>,
        local: boolean
    ) => {
        assert(
            false,
            "followedObject: no state update should occur for presenter"
        );
    };
    followedObject.on("stateChanged", followedObjectStateChangedHandler);
    const followedObjectPresenceChangedHandler = (
        presence: LivePresenceUser<IFollowModePresenceUserData<TestFollowData>>,
        local: boolean
    ) => {
        assert(false, "followedObject: no presence update should occur");
    };
    followedObject.on("presenceChanged", followedObjectPresenceChangedHandler);

    await followingObject.endSuspension();
    await followedObjectStateDone.promise;
    followingObject.off("stateChanged", followingObjectStateChangedHandler);
    followingObject.off(
        "presenceChanged",
        followingObjectPresenceChangedHandler
    );
    followedObject.off("stateChanged", followedObjectStateChangedHandler);
    followedObject.off("presenceChanged", followedObjectPresenceChangedHandler);
}
