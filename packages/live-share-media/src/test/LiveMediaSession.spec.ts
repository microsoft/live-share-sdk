/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { Deferred, TestMediaPlayer } from "./TestMediaPlayer";
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
import {
    ExtendedMediaMetadata,
    ExtendedMediaSessionActionDetails,
} from "../MediaSessionExtensions";

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
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );

        await waitForDelay(100);

        await sync2.pause();
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "pause"
        );

        console.log(testMediaPlayer1);
        console.log(testMediaPlayer2);
        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 100));
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
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );
        await waitForDelay(100);

        await sync2.pause();
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "pause"
        );

        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 2100));
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
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );
        await waitForDelay(100);

        await sync1.seekTo(2000);

        await waitForDelay(100);

        await sync2.pause();
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "pause"
        );

        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 2100));
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
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );
        await waitForDelay(200);

        await sync2.seekTo(50);

        await waitForDelay(100);

        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 150));
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
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );

        await sync1.pause();
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "pause"
        );

        await sync1.seekTo(100);

        // wait till the next event loop
        await waitForDelay(1);

        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 100));
        dispose();
    });

    it("should setTrack", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize([UserMeetingRole.organizer]);
        await object2.initialize([UserMeetingRole.organizer]);
        const sync1 = object1.synchronize(testMediaPlayer1);
        const sync2 = object2.synchronize(testMediaPlayer2);

        await sync1.play();
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );

        await waitForDelay(100);

        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 100));

        const metadata: ExtendedMediaMetadata = {
            trackIdentifier: "testTrackId",
            liveStream: false,
            album: "",
            artist: "",
            artwork: [],
            title: "",
        };
        await sync1.setTrack(metadata);
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "load"
        );
        dispose();
    });

    it("should beginSeek and suspend till endSeek", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize([UserMeetingRole.organizer]);
        await object2.initialize([UserMeetingRole.organizer]);
        const sync1 = object1.synchronize(testMediaPlayer1);
        const sync2 = object2.synchronize(testMediaPlayer2);

        await sync1.beginSeek();
        await sync2.play();
        await assertActionOccurred([testMediaPlayer2], "play");
        await waitForDelay(100);

        // should not be synced
        isAtExpectedTime(testMediaPlayer1, 0);
        isAtExpectedTime(testMediaPlayer2, 100);

        await sync1.endSeek(400);

        // wait till the next event loop
        await waitForDelay(1);

        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 400));
        dispose();
    });

    it("should not load twice", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        await object1.initialize([UserMeetingRole.organizer]);
        const sync1 = object1.synchronize(testMediaPlayer1);

        const metadata: ExtendedMediaMetadata = {
            trackIdentifier: "testTrackId",
            liveStream: false,
            album: "",
            artist: "",
            artwork: [],
            title: "",
        };
        await sync1.setTrack(metadata, [{ position: 1000 }]);
        await assertActionOccurred([testMediaPlayer1], "load");

        await sync1.play();
        await assertActionOccurred([testMediaPlayer1], "play");

        dispose();
    });

    it("should suspend at waitpoint with DIFFERENT player for ad", async () => {
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testAdPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        const testAdPlayer2 = new TestMediaPlayer();
        await object1.initialize([UserMeetingRole.organizer]);
        await object2.initialize([UserMeetingRole.organizer]);
        const sync1 = object1.synchronize(testMediaPlayer1);
        object2.synchronize(testMediaPlayer2);

        const waitPoints = [{ position: 700 }];
        const metadata: ExtendedMediaMetadata = {
            trackIdentifier: "testTrackId",
            liveStream: false,
            album: "",
            artist: "",
            artwork: [],
            title: "",
        };

        const adFinished1 = new Deferred();
        const adFinished2 = new Deferred();

        object1.setActionHandler(
            "wait",
            async (details: ExtendedMediaSessionActionDetails) => {
                // TODO: Should a waitpoint automatically pause the player?
                testMediaPlayer1.pause();

                testAdPlayer1.src = "testAdId";

                // load ad
                testAdPlayer1.load();
                await assertActionOccurred([testAdPlayer1], "load");

                // play ad
                testAdPlayer1.play();
                await assertActionOccurred([testAdPlayer1], "play");

                await waitForDelay(1000);
                adFinished1.resolve();
                details.suspension!.end();
                // TODO: Should a waitpoint end() automatically play the player?
            }
        );
        object2.setActionHandler(
            "wait",
            async (details: ExtendedMediaSessionActionDetails) => {
                // TODO: Should a waitpoint automatically pause the player?
                testMediaPlayer2.pause();

                testAdPlayer2.src = "testAdId";
                // load ad
                testAdPlayer2.load();
                await assertActionOccurred([testAdPlayer2], "load");

                // play ad
                testAdPlayer2.play();
                await assertActionOccurred([testAdPlayer2], "play");

                await waitForDelay(1000);
                adFinished2.resolve();
                details.suspension!.end();
                // TODO: Should a waitpoint end() automatically play the player?
            }
        );

        await sync1.setTrack(metadata, waitPoints);
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "load"
        );

        await sync1.play();
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );

        // expect pause from waitpoint actionHandler
        // TODO: Should a waitpoint automatically pause the player?
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "pause"
        );

        // wait for ad to play
        await Promise.all([adFinished1.promise, adFinished2.promise]);

        assert(testMediaPlayer1.src === metadata.trackIdentifier);
        assert(testMediaPlayer2.src === metadata.trackIdentifier);
        assert(testMediaPlayer1.paused === true);

        // sdk checks for waitpoints ever 500ms
        const waitPointVariance = 500;
        assert(
            isSynced(testMediaPlayer1, testMediaPlayer2, 700, waitPointVariance)
        );

        dispose();
    });

    it("should suspend at waitpoint with SAME player for ad", async () => {
        // Using the same player for an ad is not recommended
        // see unit test titled "should suspend at waitpoint with DIFFERENT player for ad" for recommended approach

        // it can still be done with the same player, described below
        const { object1, object2, dispose } = await getObjects(
            getTestObjectProvider
        );
        const testMediaPlayer1 = new TestMediaPlayer();
        const testMediaPlayer2 = new TestMediaPlayer();
        await object1.initialize([UserMeetingRole.organizer]);
        await object2.initialize([UserMeetingRole.organizer]);
        const sync1 = object1.synchronize(testMediaPlayer1);
        object2.synchronize(testMediaPlayer2);

        const waitPoints = [{ position: 700 }];
        const metadata: ExtendedMediaMetadata = {
            trackIdentifier: "testTrackId",
            liveStream: false,
            album: "",
            artist: "",
            artwork: [],
            title: "",
        };

        const adFinished1 = new Deferred();
        const adFinished2 = new Deferred();

        object1.setActionHandler(
            "wait",
            async (details: ExtendedMediaSessionActionDetails) => {
                // TODO: Should a waitpoint automatically pause the player?

                testMediaPlayer1.src = "testAdId";

                // load ad
                testMediaPlayer1.load();
                await assertActionOccurred([testMediaPlayer1], "load");

                // play ad
                testMediaPlayer1.play();
                await assertActionOccurred([testMediaPlayer1], "play");

                await waitForDelay(1000);
                assert(isAtExpectedTime(testMediaPlayer1, 1000));
                adFinished1.resolve();

                // MUST reset src and currentTime if using the same mediaPlayer before ending the suspension
                testMediaPlayer1.src = metadata.trackIdentifier;
                testMediaPlayer1.load(); // will put in paused state in test implementation
                testMediaPlayer1.currentTime =
                    details.suspension!.waitPoint!.position;

                details.suspension!.end();
                // TODO: Should a waitpoint end() automatically play the player?
            }
        );
        object2.setActionHandler(
            "wait",
            async (details: ExtendedMediaSessionActionDetails) => {
                // TODO: Should a waitpoint automatically pause the player?

                testMediaPlayer2.src = "testAdId";
                // load ad
                testMediaPlayer2.load();
                await assertActionOccurred([testMediaPlayer2], "load");

                // play ad
                testMediaPlayer2.play();
                await assertActionOccurred([testMediaPlayer2], "play");

                await waitForDelay(1000);
                assert(isAtExpectedTime(testMediaPlayer2, 1000));
                adFinished2.resolve();

                // MUST reset src and currentTime if using the same mediaPlayer before ending the suspension
                testMediaPlayer2.src = metadata.trackIdentifier;
                testMediaPlayer2.load(); // will put in paused state in test implementation
                testMediaPlayer2.currentTime =
                    details.suspension!.waitPoint!.position;

                details.suspension!.end();
                // TODO: Should a waitpoint end() automatically play the player?
            }
        );

        await sync1.setTrack(metadata, waitPoints);
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "load"
        );

        await sync1.play();
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "play"
        );

        // wait for ad to play
        await Promise.all([adFinished1.promise, adFinished2.promise]);
        // check original src was loaded again
        await assertActionOccurred(
            [testMediaPlayer1, testMediaPlayer2],
            "load"
        );
        assert(testMediaPlayer1.src === metadata.trackIdentifier);
        assert(testMediaPlayer2.src === metadata.trackIdentifier);

        // checked should be paused at waitpoint
        assert(testMediaPlayer1.paused === true);

        // sdk checks for waitpoints ever 500ms, but not specicying the variance here,
        // because video will roll back to waitpoint position (rewinding up to 500ms)
        assert(isSynced(testMediaPlayer1, testMediaPlayer2, 700));

        dispose();
    });
});

function isSynced(
    player1: TestMediaPlayer,
    player2: TestMediaPlayer,
    expectedTime: number,
    maxVariance: number = 5
) {
    console.log(player1.currentTime, player2.currentTime);
    return (
        isAtExpectedTime(player1, expectedTime, maxVariance) &&
        isAtExpectedTime(player2, expectedTime, maxVariance)
    );
}

function isAtExpectedTime(
    player: TestMediaPlayer,
    expectedTime: number,
    maxVariance: number = 5
) {
    return Math.abs(player.currentTime - expectedTime) <= maxVariance;
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

async function assertActionOccurred(
    players: TestMediaPlayer[],
    expectedAction: string
) {
    console.log("assertActionOccurred", expectedAction, players);
    const actions = await Promise.all(
        players.map((player) => player.waitForAction())
    );
    actions.forEach((action) => {
        assert(action === expectedAction);
    });
}
