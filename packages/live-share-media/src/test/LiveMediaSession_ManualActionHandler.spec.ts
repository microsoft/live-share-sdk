/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TestLiveMediaSession, TestMediaTimeStampProvider } from "./TestUtils";
import { Deferred } from "@microsoft/live-share/src/internals/Deferred";
import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import {
    ITimestampProvider,
    LiveEventScope,
    LiveEventTarget,
    LocalTimestampProvider,
    UserMeetingRole,
} from "@microsoft/live-share";
import { TestLiveShareHost } from "@microsoft/live-share";
import { getLiveDataObjectClass } from "@microsoft/live-share";
import { waitForDelay } from "@microsoft/live-share/src/internals";
import { MockLiveShareRuntime } from "@microsoft/live-share/src/test/MockLiveShareRuntime";
import {
    ExtendedMediaMetadata,
    ExtendedMediaSessionActionDetails,
} from "../MediaSessionExtensions";
import { IMediaPlayerState } from "../LiveMediaSessionCoordinator";

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

    const track1 = {
        trackIdentifier: "track1",
        title: "Test Track 1",
    } as ExtendedMediaMetadata;

    const getMediaPlayerState: () => IMediaPlayerState = () => {
        return {
            metadata: track1,
            playbackState: "none",
            positionState: undefined,
            trackData: null,
        };
    };

    object1.setRequestPlayerStateHandler(getMediaPlayerState);
    object2.setRequestPlayerStateHandler(getMediaPlayerState);

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
    "LiveMediaSession Manual Action Handlers (mostly testing coordinator)",
    (getTestObjectProvider) => {
        it("should send 'joined' event when joined.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            await object1.initialize();
            assert(
                object1.isInitialized,
                "LiveMediaSession objects not initialized"
            );
            assert(
                object1.coordinator.isInitialized,
                "LiveMediaSessionCoordinator objects not initialized"
            );
            // wait for next event loop, simulate existing user waiting for other people to join.
            // otherwise joined event will fire for both users
            await waitForDelay(1);

            // create a duplicate scope/target with same event name as one declared in coordinator
            const scope1 = new LiveEventScope(
                object1.runtimeForTesting(),
                object1.liveRuntimeForTesting()
            );

            let joinCount = 0;
            new LiveEventTarget(scope1, "joined", (event, local) => {
                joinCount += 1;
            });

            await object2.initialize();
            // wait for next event loop
            await waitForDelay(1);

            assert(joinCount == 1, `joined event not sent`);
            dispose();
        });

        it("should send 'positionUpdate' event when someone joins.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            await object1.initialize();
            // wait for next event loop, simulate existing user waiting for other people to join.
            // otherwise joined event will fire for both users
            await waitForDelay(1);

            // create a duplicate scope/target with same event name as one declared in coordinator
            const scope2 = new LiveEventScope(
                object2.runtimeForTesting(),
                object2.liveRuntimeForTesting()
            );
            let positionUpdateCount = 0;
            new LiveEventTarget(scope2, "positionUpdate", (event, local) => {
                // assert(!local, JSON.stringify(event));
                positionUpdateCount += 1;
            });

            await object2.initialize();
            // wait for next event loop
            await waitForDelay(1);

            // expected 2
            // case 1: object2 joins, listens for itself, and sends a position update
            // case 2: object2 joins, object1 listens for it, and sends a position update
            assert(
                positionUpdateCount == 2,
                `positionUpdate event not sent, ${positionUpdateCount}`
            );
            dispose();
        });

        it("should not send 'positionUpdate' event if object has canSendPositionUpdates set to false", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            await object1.initialize();
            // wait for next event loop, simulate existing user waiting for other people to join.
            // otherwise joined event will fire for both users
            await waitForDelay(1);

            // create a duplicate scope/target with same event name as one declared in coordinator
            const scope2 = new LiveEventScope(
                object2.runtimeForTesting(),
                object2.liveRuntimeForTesting()
            );
            let positionUpdateCount = 0;
            new LiveEventTarget(scope2, "positionUpdate", (event, local) => {
                // assert(!local, JSON.stringify(event));
                positionUpdateCount += 1;
            });

            object2.coordinator.canSendPositionUpdates = false;
            await object2.initialize();
            // wait for next event loop
            await waitForDelay(1);

            // expected 1: object2 joins, object1 listens for it, and sends a position update
            // object2 should not send a position update for its own joined event
            assert(
                positionUpdateCount == 1,
                `positionUpdate event not sent, ${positionUpdateCount}`
            );
            dispose();
        });

        it("should send 'positionUpdate' event regularly.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            let startOfTest = Date.now();
            const positionState: () => IMediaPlayerState = () => ({
                metadata: null,
                playbackState: "playing",
                positionState: {
                    position: (Date.now() - startOfTest) / 1000,
                },
                trackData: null,
            });

            // create a duplicate scope/target with same event name as one declared in coordinator
            const scope1 = new LiveEventScope(
                object1.runtimeForTesting(),
                object1.liveRuntimeForTesting()
            );

            let posUpdateCount = 0;
            const done = new Deferred();
            new LiveEventTarget(scope1, "positionUpdate", (event, local) => {
                if (!local) return;

                posUpdateCount += 1;
                if (posUpdateCount > 6) {
                    done.resolve();
                }
            });

            await object1.initialize();
            await object2.initialize();

            await waitForDelay(1);
            await object2.coordinator.play();
            setInterval(async () => {
                object1.coordinator.sendPositionUpdate(positionState());
                object2.coordinator.sendPositionUpdate(positionState());
            }, 100);
            await done.promise;
            assert(
                posUpdateCount >= 6,
                `pos update should be >= 6, instead is ${posUpdateCount}`
            );

            dispose();
        });

        it("should broadcast 'play' transport command.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            const donePlay1 = new Deferred();
            const donePlay2 = new Deferred();

            object1.setActionHandler(
                "play",
                (details: ExtendedMediaSessionActionDetails) => {
                    donePlay1.resolve();
                }
            );
            object2.setActionHandler(
                "play",
                (details: ExtendedMediaSessionActionDetails) => {
                    donePlay2.resolve();
                }
            );

            await object1.initialize();
            await object2.initialize();

            await object1.coordinator.play();
            await donePlay1.promise;
            await donePlay2.promise;
            await waitForDelay(1);
            dispose();
        });

        it("should broadcast 'pause' transport command.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            const donePause1 = new Deferred();
            const donePause2 = new Deferred();

            object1.setActionHandler(
                "pause",
                (details: ExtendedMediaSessionActionDetails) => {
                    donePause1.resolve();
                }
            );
            object2.setActionHandler(
                "pause",
                (details: ExtendedMediaSessionActionDetails) => {
                    donePause2.resolve();
                }
            );

            await object1.initialize();
            await object2.initialize();

            await object2.coordinator.pause();
            await donePause1.promise;
            await donePause2.promise;
            await waitForDelay(1);
            dispose();
        });

        it("should broadcast 'seekTo' transport command.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            const done1 = new Deferred();
            const done2 = new Deferred();

            object1.setActionHandler(
                "seekto",
                (details: ExtendedMediaSessionActionDetails) => {
                    assert(details.seekTime === 100);
                    done1.resolve();
                }
            );
            object2.setActionHandler(
                "seekto",
                (details: ExtendedMediaSessionActionDetails) => {
                    assert(details.seekTime === 100);
                    done2.resolve();
                }
            );

            await object1.initialize();
            await object2.initialize();

            await object2.coordinator.seekTo(100);
            await done1.promise;
            await done2.promise;
            await waitForDelay(1);
            dispose();
        });

        it("should broadcast 'setTrack' transport command.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider
            );

            const done1 = new Deferred();
            const done2 = new Deferred();

            const track2 = {
                trackIdentifier: "track2",
                title: "Test Track 2",
            } as ExtendedMediaMetadata;

            object1.setActionHandler(
                "settrack",
                (details: ExtendedMediaSessionActionDetails) => {
                    assert(
                        JSON.stringify(details.metadata) ===
                            JSON.stringify(track2)
                    );
                    done1.resolve();
                }
            );
            object2.setActionHandler(
                "settrack",
                (details: ExtendedMediaSessionActionDetails) => {
                    assert(
                        JSON.stringify(details.metadata) ===
                            JSON.stringify(track2)
                    );
                    done2.resolve();
                }
            );

            await object1.initialize();
            await object2.initialize();

            await object2.coordinator.setTrack(track2);
            await done1.promise;
            await done2.promise;
            await waitForDelay(1);
            dispose();
        });

        it("should broadcast 'catchup' transport command.", async () => {
            const { object1, object2, dispose } = await getObjects(
                getTestObjectProvider,
                10000,
                new TestMediaTimeStampProvider()
            );

            const done = new Deferred();

            const track1 = {
                trackIdentifier: "track1",
                title: "Test Track 1",
                liveStream: true,
            } as ExtendedMediaMetadata;

            let startOfTest = Date.now();

            const positionLeaderState: () => IMediaPlayerState = () => ({
                metadata: track1,
                playbackState: "playing",
                positionState: {
                    position: (Date.now() - startOfTest) / 1000,
                },
                trackData: null,
            });

            const positionLaggerState: () => IMediaPlayerState = () => ({
                metadata: track1,
                playbackState: "playing",
                positionState: {
                    position: (Date.now() - startOfTest) / 1000 / 2,
                },
                trackData: null,
            });

            object1.setRequestPlayerStateHandler(positionLeaderState);
            object2.setRequestPlayerStateHandler(positionLaggerState);

            object2.setActionHandler(
                "catchup",
                (details: ExtendedMediaSessionActionDetails) => {
                    done.resolve();
                }
            );

            await object1.initialize();
            await object2.initialize();

            setInterval(async () => {
                object1.coordinator.sendPositionUpdate(positionLeaderState());
                object2.coordinator.sendPositionUpdate(positionLaggerState());
            }, 100);

            await object1.coordinator.play();
            await done.promise;
            dispose();
        });
    }
);
