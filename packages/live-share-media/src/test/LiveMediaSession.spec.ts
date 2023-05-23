/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TestMediaPlayer } from "./TestMediaPlayer";
import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { UserMeetingRole } from "@microsoft/live-share";
import { TestLiveShareHost } from "@microsoft/live-share";
import { getLiveDataObjectClassProxy } from "@microsoft/live-share";
import { LiveMediaSession } from "../LiveMediaSession";
import { waitForDelay } from "@microsoft/live-share/src/internals";
import { MockLiveShareRuntime } from "@microsoft/live-share/src/test/MockLiveShareRuntime";
import { isErrorLike } from "@microsoft/live-share/bin/internals";

class TestLiveMediaSession extends LiveMediaSession {
    public async clientId(): Promise<string> {
        return await this.waitUntilConnected();
    }
}

async function getObjects(
    getTestObjectProvider,
    updateInterval: number = 10000
) {
    const host = TestLiveShareHost.create();
    let liveRuntime1 = new MockLiveShareRuntime(false, updateInterval, host);
    let liveRuntime2 = new MockLiveShareRuntime(false, updateInterval, host);

    let ObjectProxy1: any = getLiveDataObjectClassProxy<TestLiveMediaSession>(
        TestLiveMediaSession,
        liveRuntime1
    );
    let ObjectProxy2: any = getLiveDataObjectClassProxy<TestLiveMediaSession>(
        TestLiveMediaSession,
        liveRuntime2
    );

    await liveRuntime1.start();
    await liveRuntime2.start();

    let provider: ITestObjectProvider = getTestObjectProvider();

    let container1 = await provider.createContainer(ObjectProxy1.factory);
    let object1 = await requestFluidObject<TestLiveMediaSession>(
        container1,
        "default"
    );
    object1.coordinator.positionUpdateInterval = 0.02;

    let container2 = await provider.loadContainer(ObjectProxy2.factory);
    let object2 = await requestFluidObject<TestLiveMediaSession>(
        container2,
        "default"
    );
    object2.coordinator.positionUpdateInterval = 0.02;
    // need to be connected to send signals
    if (!container1.connect) {
        await new Promise((resolve) => container1.once("connected", resolve));
    }
    if (!container2.connect) {
        await new Promise((resolve) => container2.once("connected", resolve));
    }
    const setObjectRoles = async (
        clientId: string,
        roles: UserMeetingRole[]
    ) => {
        (host as TestLiveShareHost).addClient(clientId, roles);
    };
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
        setObjectRoles,
    };
}

describeNoCompat("LiveMediaSession", (getTestObjectProvider) => {
    it("should play and pause on both", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize();
        await object2.initialize();
        const sync1 = object1.synchronize(testMediaPlayer1);
        const sync2 = object2.synchronize(testMediaPlayer2);

        await sync1.play();
        const playActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        assert(playActions[0] === "play");
        assert(playActions[1] === "play");

        await waitForDelay(100);

        await sync2.pause();
        const pauseActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        assert(pauseActions[0] === "pause");
        assert(pauseActions[1] === "pause");

        console.log(testMediaPlayer1);
        console.log(testMediaPlayer2);
        assert(isSynced(testMediaPlayer1, testMediaPlayer2));
        assert(testMediaPlayer1.currentTime >= 100);
        assert(testMediaPlayer2.currentTime >= 100);
        dispose();
    });

    it("should seek forward and play then pause", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize();
        await object2.initialize();
        const sync1 = object1.synchronize(testMediaPlayer1);
        const sync2 = object2.synchronize(testMediaPlayer2);

        await sync1.seekTo(2000);

        await sync1.play();
        const playActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        console.log("playActions", playActions);
        assert(playActions[0] === "play");
        assert(playActions[1] === "play");
        await waitForDelay(100);

        await sync2.pause();
        const pauseActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        console.log("pauseActions", pauseActions);
        assert(pauseActions[0] === "pause");
        assert(pauseActions[1] === "pause");

        assert(isSynced(testMediaPlayer1, testMediaPlayer2));
        assert(testMediaPlayer1.currentTime >= 2100); //todo
        assert(testMediaPlayer2.currentTime >= 2100); //todo
        dispose();
    });

    it("should play then seek forward then pause", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize();
        await object2.initialize();
        const sync1 = object1.synchronize(testMediaPlayer1);
        const sync2 = object2.synchronize(testMediaPlayer2);

        await sync1.play();
        const playActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        console.log("playActions", playActions);
        assert(playActions[0] === "play");
        assert(playActions[1] === "play");
        await waitForDelay(100);

        await sync1.seekTo(2000);

        await waitForDelay(100);

        await sync2.pause();
        const pauseActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        console.log("pauseActions", pauseActions);
        assert(pauseActions[0] === "pause");
        assert(pauseActions[1] === "pause");

        assert(isSynced(testMediaPlayer1, testMediaPlayer2));
        assert(testMediaPlayer1.currentTime >= 2100);
        assert(testMediaPlayer2.currentTime >= 2100);
        dispose();
    });

    it("should play then seek backwards then keep playing", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize();
        await object2.initialize();
        const sync1 = object1.synchronize(testMediaPlayer1);
        const sync2 = object2.synchronize(testMediaPlayer2);

        await sync1.play();
        const playActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        console.log("playActions", playActions);
        assert(playActions[0] === "play");
        assert(playActions[1] === "play");
        await waitForDelay(200);

        await sync2.seekTo(50);

        await waitForDelay(101);

        assert(isSynced(testMediaPlayer1, testMediaPlayer2));
        assert(testMediaPlayer1.currentTime >= 150);
        assert(testMediaPlayer2.currentTime >= 150);
        dispose();
    });

    it("should only let organizer play, pause, seek", async () => {
        const { object1, object2, dispose, setObjectRoles } = await getObjects(
            getTestObjectProvider
        );
        setObjectRoles(await object1.clientId(), [UserMeetingRole.organizer]);
        setObjectRoles(await object2.clientId(), [UserMeetingRole.attendee]);
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize([UserMeetingRole.organizer]);
        await object2.initialize([UserMeetingRole.organizer]);
        const sync1 = object1.synchronize(testMediaPlayer1);
        const sync2 = object2.synchronize(testMediaPlayer2);

        await assertRoleError(() => sync2.play());
        await assertRoleError(() => sync2.seekTo(100));
        await assertRoleError(() => sync2.pause());

        await sync1.play();
        const playActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);
        assert(playActions[0] === "play");
        assert(playActions[1] === "play");

        await sync1.pause();
        const pauseActions = await Promise.all([
            testMediaPlayer1.waitForAction(),
            testMediaPlayer2.waitForAction(),
        ]);

        console.log("pauseActions", pauseActions);
        assert(pauseActions[0] === "pause");
        assert(pauseActions[1] === "pause");

        await sync1.seekTo(100);
        await waitForDelay(1);
        assert(testMediaPlayer1.currentTime === 100);
        assert(testMediaPlayer2.currentTime === 100);
        dispose();
    });
});

function isSynced(player1: TestMediaPlayer, player2: TestMediaPlayer) {
    console.log(player1.currentTime, player2.currentTime);
    return Math.abs(player1.currentTime - player2.currentTime) <= 3;
}

async function assertRoleError(command: () => Promise<void>) {
    try {
        await command();
        assert(false);
    } catch (e: any) {
        if (isErrorLike(e)) {
            console.log(e);
            assert(
                e.message.includes(
                    'The local user doesn\'t have a role of ["Organizer"]'
                )
            );
        } else {
            assert(false);
        }
    }
}
