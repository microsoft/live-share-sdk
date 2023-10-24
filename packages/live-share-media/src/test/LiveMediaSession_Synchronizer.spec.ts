/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    TestLiveMediaSession,
    TestMediaPlayer,
    TestMediaTimeStampProvider,
} from "./TestUtils";
import { Deferred } from "@microsoft/live-share/src/internals/Deferred";
import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import {
    ITimestampProvider,
    LocalTimestampProvider,
    UserMeetingRole,
} from "@microsoft/live-share";
import { TestLiveShareHost } from "@microsoft/live-share";
import { getLiveDataObjectClass } from "@microsoft/live-share";
import { waitForDelay } from "@microsoft/live-share/src/internals";
import { MockLiveShareRuntime } from "@microsoft/live-share/src/test/MockLiveShareRuntime";
import { isErrorLike } from "@microsoft/live-share/bin/internals";
import {
    ExtendedMediaMetadata,
    ExtendedMediaSessionActionDetails,
    ExtendedMediaSessionActionSource,
} from "../MediaSessionExtensions";
import {
    IMediaPlayerSynchronizerEvent,
    MediaPlayerSynchronizer,
    MediaPlayerSynchronizerEvents,
} from "../MediaPlayerSynchronizer";

async function getObjects(
    getTestObjectProvider,
    updateInterval: number = 10000,
    timestampProvider: ITimestampProvider = new LocalTimestampProvider()
) {
    const host = TestLiveShareHost.create();
    let liveRuntime1 = new MockLiveShareRuntime(
        false,
        updateInterval,
        host,
        timestampProvider
    );
    let liveRuntime2 = new MockLiveShareRuntime(
        false,
        updateInterval,
        host,
        timestampProvider
    );

    let ObjectProxy1: any = getLiveDataObjectClass<TestLiveMediaSession>(
        TestLiveMediaSession,
        liveRuntime1
    );
    let ObjectProxy2: any = getLiveDataObjectClass<TestLiveMediaSession>(
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

describeNoCompat(
    "LiveMediaSession Using MediaPlayerSynchronizer",
    (getTestObjectProvider) => {
        it("should play and pause on both", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            const testMediaPlayer1 = new TestMediaPlayer();
            const testMediaPlayer2 = new TestMediaPlayer();
            await object1.initialize();
            await object2.initialize();
            const expectedEventOrder: IExpectedEvent[] = [
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "pause",
                    clientId: await object2.clientId(),
                    local: true,
                    source: "user",
                },
            ];
            const sync1 = object1.synchronize(testMediaPlayer1);
            const sync2 = object2.synchronize(testMediaPlayer2);
            const eventAssertPromise = assertExpectedEvents(
                sync2,
                expectedEventOrder
            );

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

            assert(isSynced(testMediaPlayer1, testMediaPlayer2, 0.1));
            await eventAssertPromise;
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
            const expectedEventOrder: IExpectedEvent[] = [
                {
                    action: "seekto",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "pause",
                    clientId: await object2.clientId(),
                    local: true,
                    source: "user",
                },
            ];
            const sync1 = object1.synchronize(testMediaPlayer1);
            const sync2 = object2.synchronize(testMediaPlayer2);
            const eventAssertPromise = assertExpectedEvents(
                sync2,
                expectedEventOrder
            );

            await sync1.seekTo(2);

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

            assert(isSynced(testMediaPlayer1, testMediaPlayer2, 2.1));
            await eventAssertPromise;
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
            const expectedEventOrder: IExpectedEvent[] = [
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "seekto",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "pause",
                    clientId: await object2.clientId(),
                    local: true,
                    source: "user",
                },
            ];
            const sync1 = object1.synchronize(testMediaPlayer1);
            const sync2 = object2.synchronize(testMediaPlayer2);
            const eventAssertPromise = assertExpectedEvents(
                sync2,
                expectedEventOrder
            );

            await sync1.play();
            await assertActionOccurred(
                [testMediaPlayer1, testMediaPlayer2],
                "play"
            );
            await waitForDelay(100);

            await sync1.seekTo(2);

            await waitForDelay(100);

            await sync2.pause();
            await assertActionOccurred(
                [testMediaPlayer1, testMediaPlayer2],
                "pause"
            );

            assert(isSynced(testMediaPlayer1, testMediaPlayer2, 2.1));
            await eventAssertPromise;
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

            await sync2.seekTo(0.05);

            await waitForDelay(100);

            assert(isSynced(testMediaPlayer1, testMediaPlayer2, 0.15));
            dispose();
        });

        it("should only let organizer play, pause, seek", async () => {
            const { object1, object2, dispose, setObjectRoles } =
                await getObjects(getTestObjectProvider);
            setObjectRoles(await object1.clientId(), [
                UserMeetingRole.organizer,
            ]);
            setObjectRoles(await object2.clientId(), [
                UserMeetingRole.attendee,
            ]);
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
            const expectedEventOrder: IExpectedEvent[] = [
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "settrack",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
            ];
            const sync1 = object1.synchronize(testMediaPlayer1);
            const sync2 = object2.synchronize(testMediaPlayer2);
            const eventAssertPromise = assertExpectedEvents(
                sync2,
                expectedEventOrder
            );

            await sync1.play();
            await assertActionOccurred(
                [testMediaPlayer1, testMediaPlayer2],
                "play"
            );

            await waitForDelay(100);

            assert(isSynced(testMediaPlayer1, testMediaPlayer2, 0.1));

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
            await eventAssertPromise;
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
            const object1ExpectedEventOrder: IExpectedEvent[] = [
                {
                    action: "seekto",
                    clientId: await object1.clientId(),
                    local: true,
                    source: "user",
                },
            ];
            const object2ExpectedEventOrder: IExpectedEvent[] = [
                {
                    action: "play",
                    clientId: await object2.clientId(),
                    local: true,
                    source: "user",
                },
                {
                    action: "seekto",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
            ];
            const sync1 = object1.synchronize(testMediaPlayer1);
            const sync2 = object2.synchronize(testMediaPlayer2);

            const eventAssertPromise1 = assertExpectedEvents(
                sync1,
                object1ExpectedEventOrder
            );
            const eventAssertPromise2 = assertExpectedEvents(
                sync2,
                object2ExpectedEventOrder
            );

            await sync1.beginSeek();
            await sync2.play();
            await assertActionOccurred([testMediaPlayer2], "play");
            await waitForDelay(100);

            // should not be synced
            isAtExpectedTime(testMediaPlayer1, 0);
            isAtExpectedTime(testMediaPlayer2, 0.1);

            await sync1.endSeek(0.4);

            // wait till the next event loop
            await waitForDelay(1);

            assert(isSynced(testMediaPlayer1, testMediaPlayer2, 0.4));
            await eventAssertPromise1;
            await eventAssertPromise2;
            dispose();
        });

        it("should not load twice", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );
            const testMediaPlayer1 = new TestMediaPlayer();
            await object1.initialize([UserMeetingRole.organizer]);
            const expectedEventOrder: IExpectedEvent[] = [
                {
                    action: "settrack",
                    clientId: await object1.clientId(),
                    local: true,
                    source: "user",
                },
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: true,
                    source: "user",
                },
            ];
            const sync1 = object1.synchronize(testMediaPlayer1);
            const eventAssertPromise = assertExpectedEvents(
                sync1,
                expectedEventOrder
            );
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
            await eventAssertPromise;

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

            const waitPoints = [{ position: 0.7 }];
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
                    // pause content
                    testMediaPlayer1.pause();

                    testAdPlayer1.src = "testAdId";

                    // load ad
                    testAdPlayer1.load();
                    await assertActionOccurred([testAdPlayer1], "load");

                    // play ad
                    testAdPlayer1.play();
                    await assertActionOccurred([testAdPlayer1], "play");

                    await waitForDelay(500);
                    assert(isAtExpectedTime(testAdPlayer1, 0.5));
                    adFinished1.resolve();

                    details.suspension!.end();
                }
            );
            object2.setActionHandler(
                "wait",
                async (details: ExtendedMediaSessionActionDetails) => {
                    // pause content
                    testMediaPlayer2.pause();

                    testAdPlayer2.src = "testAdId";
                    // load ad
                    testAdPlayer2.load();
                    await assertActionOccurred([testAdPlayer2], "load");

                    // play ad
                    testAdPlayer2.play();
                    await assertActionOccurred([testAdPlayer2], "play");

                    await waitForDelay(500);
                    assert(isAtExpectedTime(testAdPlayer2, 0.5));
                    adFinished2.resolve();

                    details.suspension!.end();
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
            await assertActionOccurred(
                [testMediaPlayer1, testMediaPlayer2],
                "pause"
            );

            // wait for ad to play
            await Promise.all([adFinished1.promise, adFinished2.promise]);

            assert(testMediaPlayer1.src === metadata.trackIdentifier);
            assert(testMediaPlayer2.src === metadata.trackIdentifier);
            assert(testMediaPlayer1.paused === true);
            assert(testMediaPlayer2.paused === true);

            // sdk checks for waitpoints ever 500ms
            const waitPointVariance = 0.5;
            assert(
                isSynced(
                    testMediaPlayer1,
                    testMediaPlayer2,
                    0.7,
                    waitPointVariance
                )
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

            const waitPoints = [{ position: 0.7 }];
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
                    testMediaPlayer1.src = "testAdId";

                    // load ad
                    testMediaPlayer1.load();
                    await assertActionOccurred([testMediaPlayer1], "load");

                    // play ad
                    testMediaPlayer1.play();
                    await assertActionOccurred([testMediaPlayer1], "play");

                    await waitForDelay(500);
                    assert(isAtExpectedTime(testMediaPlayer1, 0.5));
                    adFinished1.resolve();

                    // MUST reset src and currentTime if using the same mediaPlayer before ending the suspension
                    testMediaPlayer1.src = metadata.trackIdentifier;
                    testMediaPlayer1.load(); // will put in paused state in test implementation
                    testMediaPlayer1.currentTime =
                        details.suspension!.waitPoint!.position;

                    details.suspension!.end();
                }
            );
            object2.setActionHandler(
                "wait",
                async (details: ExtendedMediaSessionActionDetails) => {
                    testMediaPlayer2.src = "testAdId";
                    // load ad
                    testMediaPlayer2.load();
                    await assertActionOccurred([testMediaPlayer2], "load");

                    // play ad
                    testMediaPlayer2.play();
                    await assertActionOccurred([testMediaPlayer2], "play");

                    await waitForDelay(500);
                    assert(isAtExpectedTime(testMediaPlayer2, 0.5));
                    adFinished2.resolve();

                    // MUST reset src and currentTime if using the same mediaPlayer before ending the suspension
                    testMediaPlayer2.src = metadata.trackIdentifier;
                    testMediaPlayer2.load(); // will put in paused state in test implementation
                    testMediaPlayer2.currentTime =
                        details.suspension!.waitPoint!.position;

                    details.suspension!.end();
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
            assert(testMediaPlayer2.paused === true);

            // sdk checks for waitpoints ever 500ms, but not specifying the variance here,
            // because video will roll back to waitpoint position (rewinding up to 500ms)
            assert(isSynced(testMediaPlayer1, testMediaPlayer2, 0.7));

            dispose();
        });

        it("client should catchup to leader", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider,
                10000,
                new TestMediaTimeStampProvider()
            );
            const catchupTriggered = new Deferred();
            const metadata: ExtendedMediaMetadata = {
                trackIdentifier: "testTrackId",
                liveStream: false,
                album: "",
                artist: "",
                artwork: [],
                title: "",
            };
            const testMediaPlayer1 = new TestMediaPlayer();
            const testMediaPlayer2 = new TestMediaPlayer((currentTime) => {
                console.log("currentTime", currentTime);
                if (
                    isSynced(
                        testMediaPlayer1,
                        testMediaPlayer2,
                        testMediaPlayer1.currentTime
                    ) &&
                    currentTime >= 1
                ) {
                    catchupTriggered.resolve();
                }
            });

            await object1.initialize();
            await object2.initialize();
            const object1ExpectedEventOrder: IExpectedEvent[] = [
                {
                    action: "settrack",
                    clientId: await object1.clientId(),
                    local: true,
                    source: "user",
                },
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: true,
                    source: "user",
                },
            ];
            const object2ExpectedEventOrder: IExpectedEvent[] = [
                {
                    action: "settrack",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "user",
                },
                {
                    action: "catchup",
                    clientId: await object2.clientId(),
                    local: true,
                    source: "system",
                },
                {
                    action: "play",
                    clientId: await object1.clientId(),
                    local: false,
                    source: "system",
                },
            ];
            const sync1 = object1.synchronize(testMediaPlayer1);
            const sync2 = object2.synchronize(testMediaPlayer2);

            const eventAssertPromise1 = assertExpectedEvents(
                sync1,
                object1ExpectedEventOrder
            );
            const eventAssertPromise2 = assertExpectedEvents(
                sync2,
                object2ExpectedEventOrder
            );

            await sync1.setTrack(metadata);
            await assertActionOccurred(
                [testMediaPlayer1, testMediaPlayer2],
                "load"
            );
            await sync1.play();

            // simulate testMediaPlayer2 getting behind
            setInterval(() => {
                testMediaPlayer2.pause();
            }, 100);

            await catchupTriggered.promise;
            await eventAssertPromise1;
            await eventAssertPromise2;
            dispose();
        });
    }
);

function isSynced(
    player1: TestMediaPlayer,
    player2: TestMediaPlayer,
    expectedTime: number,
    maxVariance: number = 10
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
    maxVariance: number = 10
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
    const actions = await Promise.all(
        players.map((player) => player.waitForAction())
    );
    actions.forEach((action) => {
        assert(action === expectedAction);
    });
}

interface IExpectedEvent {
    action: string;
    clientId: string;
    local: boolean;
    source: ExtendedMediaSessionActionSource;
}

async function assertExpectedEvents(
    synchronizer: MediaPlayerSynchronizer,
    expectedEventOrder: IExpectedEvent[]
): Promise<void> {
    let deferred = new Deferred();
    let eventCount = 0;
    let timeout;
    synchronizer.addEventListener(
        MediaPlayerSynchronizerEvents.groupaction,
        (evt: IMediaPlayerSynchronizerEvent) => {
            try {
                const details = evt.details;
                assert(evt.error === undefined, evt.error);
                const expectedEvent = expectedEventOrder[eventCount];
                assert(
                    details.action === expectedEvent.action,
                    `unexpected action: should be ${expectedEvent.action}, instead is ${details.action}`
                );
                assert(
                    details.clientId ===
                        expectedEventOrder[eventCount].clientId,
                    `unexpected sender clientId: should be ${expectedEvent.clientId}, instead is ${details.clientId}`
                );
                assert(
                    details.local === expectedEventOrder[eventCount].local,
                    `unexpected locality: should be ${expectedEvent.local}, instead is ${details.local}`
                );
                assert(
                    details.source === expectedEventOrder[eventCount].source,
                    `unexpected source: should be ${expectedEvent.source}, instead is ${details.source}`
                );
                eventCount += 1;
            } catch (error: any) {
                deferred.reject(
                    new Error(
                        `error for event: ${JSON.stringify(
                            evt
                        )}, eventCount ${eventCount}, ${error}`
                    )
                );
            }

            if (eventCount === expectedEventOrder.length) {
                timeout = setTimeout(() => {
                    deferred.resolve();
                }, 200);
            } else if (eventCount > expectedEventOrder.length) {
                deferred.reject(new Error(`more events than expected, ${evt}`));
            }
        }
    );

    return deferred.promise;
}
