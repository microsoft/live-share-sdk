/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TestLiveMediaSession, TestMediaTimeStampProvider } from "./TestUtils";
import { strict as assert } from "assert";
import {
    ITestObjectProvider,
    fluidEntryPoint,
    getContainerEntryPointBackCompat,
} from "@fluidframework/test-utils/internal";
import {
    ITimestampProvider,
    LocalTimestampProvider,
    UserMeetingRole,
    TestLiveShareHost,
    LiveShareClient,
} from "@microsoft/live-share";
import {
    getLiveDataObjectKind,
    LiveEventScope,
    LiveEventTarget,
    MockLiveShareRuntime,
    MockTokenProvider,
    waitForDelay,
    Deferred,
    LiveShareRuntime,
} from "@microsoft/live-share/internal";
import {
    ExtendedMediaMetadata,
    ExtendedMediaSessionActionDetails,
} from "../MediaSessionExtensions";
import { IMediaPlayerState } from "../LiveMediaSessionCoordinator";
import {
    ITestObjectProviderOptions,
    describeCompat,
} from "@live-share-private/test-utils";
import { InsecureTokenProvider } from "@fluidframework/test-runtime-utils/internal";
import { ContainerSchema, IFluidContainer } from "fluid-framework";
import { AzureContainerServices } from "@fluidframework/azure-client";
import { LiveMediaSession } from "../LiveMediaSession";

// async function getObjects(
//     getTestObjectProvider: (
//         options?: ITestObjectProviderOptions
//     ) => ITestObjectProvider,
//     updateInterval: number = 10000,
//     timestampProvider: ITimestampProvider = new LocalTimestampProvider()
// ) {
//     const host = TestLiveShareHost.create(new MockTokenProvider());
//     let liveRuntime1 = new MockLiveShareRuntime(
//         false,
//         updateInterval,
//         host,
//         timestampProvider
//     );
//     let liveRuntime2 = new MockLiveShareRuntime(
//         false,
//         updateInterval,
//         host,
//         timestampProvider
//     );

//     let ObjectProxy1: any = getLiveDataObjectKind<TestLiveMediaSession>(
//         TestLiveMediaSession,
//         liveRuntime1 as unknown as LiveShareRuntime
//     );
//     let ObjectProxy2: any = getLiveDataObjectKind<TestLiveMediaSession>(
//         TestLiveMediaSession,
//         liveRuntime2 as unknown as LiveShareRuntime
//     );

//     await liveRuntime1.start();
//     await liveRuntime2.start();

//     let provider: ITestObjectProvider = getTestObjectProvider();

//     let container1 = await provider.createContainer(
//         ObjectProxy1.factory as fluidEntryPoint
//     );
//     let object1 =
//         await getContainerEntryPointBackCompat<TestLiveMediaSession>(
//             container1
//         );
//     object1.coordinator.positionUpdateInterval = 0.02;
//     let container2 = await provider.loadContainer(
//         ObjectProxy2.factory as fluidEntryPoint
//     );
//     let object2 =
//         await getContainerEntryPointBackCompat<TestLiveMediaSession>(
//             container2
//         );
//     object2.coordinator.positionUpdateInterval = 0.02;

//     const track1 = {
//         trackIdentifier: "track1",
//         title: "Test Track 1",
//     } as ExtendedMediaMetadata;

//     const getMediaPlayerState: () => IMediaPlayerState = () => {
//         return {
//             metadata: track1,
//             playbackState: "none",
//             positionState: undefined,
//             trackData: null,
//         };
//     };

//     object1.setRequestPlayerStateHandler(getMediaPlayerState);
//     object2.setRequestPlayerStateHandler(getMediaPlayerState);

//     // need to be connected to send signals
//     if (!container1.connect) {
//         await new Promise((resolve) => container1.once("connected", resolve));
//     }
//     if (!container2.connect) {
//         await new Promise((resolve) => container2.once("connected", resolve));
//     }
//     const setObjectRoles = async (
//         clientId: string,
//         roles: UserMeetingRole[]
//     ) => {
//         (host as TestLiveShareHost).addClient(clientId, roles);
//     };
//     const dispose = () => {
//         object1.dispose();
//         object2.dispose();
//         container1.disconnect?.();
//         container2.disconnect?.();
//         liveRuntime1.stop();
//         liveRuntime2.stop();
//     };
//     return {
//         object1,
//         object2,
//         dispose,
//         setObjectRoles,
//     };
// }

describeCompat(
    "LiveMediaSession Manual Action Handlers (mostly testing coordinator)",
    () => {
        let containerId: string | undefined;
        const getContainerId = (): string | undefined => {
            return containerId;
        };
        const setContainerId = (newContainerId: string) => {
            containerId = newContainerId;
        };
        const host = TestLiveShareHost.create(
            new InsecureTokenProvider("", {
                id: "testId",
                name: "Test User",
            }),
            getContainerId,
            setContainerId
        );
        let client1: LiveShareClient;
        let client2: LiveShareClient;
        let object1: LiveMediaSession;
        let object2: LiveMediaSession;

        const testMediaSessionKey = "TEST-LIVE-MEDIA-SESSION-KEY";

        const dispose = () => {
            object1.dispose();
            object2.dispose();
            client1.results?.container?.disconnect?.();
            client2.results?.container?.disconnect?.();
        };

        const setObjectRoles = async (
            clientId: string,
            roles: UserMeetingRole[]
        ) => {
            (host as TestLiveShareHost).addClient(clientId, roles);
        };

        const start = async (
            timestampProvider: ITimestampProvider = new LocalTimestampProvider()
        ) => {
            client1 = new LiveShareClient(host, {
                timestampProvider,
            });
            client2 = new LiveShareClient(host, {
                timestampProvider,
            });
            const schema: ContainerSchema = {
                initialObjects: {
                    [testMediaSessionKey]: LiveMediaSession,
                },
            };
            containerId = undefined;

            await client1.join(schema);
            await client2.join(schema);
            // state map not initialized until dynamic features are used.
            object1 = await client1.getDDS<LiveMediaSession>(
                "test",
                LiveMediaSession
            );
            object1.coordinator.positionUpdateInterval = 0.02;
            object2 = await client2.getDDS<LiveMediaSession>(
                "test",
                LiveMediaSession
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
        };

        it("should send 'positionUpdate' event when someone joins.", async () => {
            await start();
            await object1.initialize();
            // wait for next event loop, simulate existing user waiting for other people to join.
            // otherwise joined event will fire for both users
            await waitForDelay(1);
            let positionUpdateCount = 0;

            const scope2 = new LiveEventScope(
                // @ts-ignore-next-line
                object2.runtime,
                // @ts-ignore-next-line
                object2._liveRuntime
            );

            scope2.onEvent("positionUpdate", (event, local) => {
                // assert(!local, JSON.stringify(event));
                positionUpdateCount += 1;
            });

            await object2.initialize();

            // wait for next event loop
            await waitForDelay(1);

            // expected 1
            // case 1: object2 joins, listens for itself (no event is emitted for local updates), and sends a position update
            //  - reason no local event is emitted is because the targetClientId for position updates is for the remote user
            // case 2: object2 joins, object1 listens for it, and sends a position update
            assert(
                positionUpdateCount == 1,
                `positionUpdate event not sent, ${positionUpdateCount}`
            );

            dispose();
        });

        it("should not send 'positionUpdate' event if object has canSendPositionUpdates set to false", async () => {
            await start();
            await object1.initialize();
            // wait for next event loop, simulate existing user waiting for other people to join.
            // otherwise joined event will fire for both users
            await waitForDelay(1);

            let positionUpdateCount = 0;
            const scope2 = new LiveEventScope(
                // @ts-ignore-next-line
                object2.runtime,
                // @ts-ignore-next-line
                object2._liveRuntime
            );
            new LiveEventTarget(
                // @ts-ignore-next-line
                scope2,
                "positionUpdate",
                (event, local) => {
                    positionUpdateCount += 1;
                }
            );

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

        it("should send 'positionUpdate' event if object has canSendPositionUpdates set to false, but is suspended", async () => {
            await start();
            const positionState: (position: number) => IMediaPlayerState = (
                position: number
            ) => ({
                metadata: null,
                playbackState: "paused",
                positionState: {
                    position: position,
                },
                trackData: null,
            });

            setObjectRoles(
                // @ts-ignore-next-line
                await object1.waitUntilConnected(),
                [UserMeetingRole.organizer]
            );
            setObjectRoles(
                // @ts-ignore-next-line
                await object2.waitUntilConnected(),
                [UserMeetingRole.attendee]
            );

            await object1.initialize([
                UserMeetingRole.presenter,
                UserMeetingRole.organizer,
            ]);

            object2.coordinator.canSendPositionUpdates = false;
            await object2.initialize([
                UserMeetingRole.presenter,
                UserMeetingRole.organizer,
            ]);
            // wait for next event loop
            await waitForDelay(1);

            await object1.coordinator.seekTo(30);
            object1.coordinator.sendPositionUpdate(positionState(30));
            object2.coordinator.beginSuspension();
            await waitForDelay(1);
            object2.coordinator.sendPositionUpdate(positionState(200));
            await waitForDelay(1);

            assert(
                // casting as any to access private properties
                (object2.coordinator as any)._groupState?.playbackPosition
                    .localPosition.position === 200,
                "local position update event was not sent"
            );

            await waitForDelay(1);
            assert(
                // casting as any to access private properties
                (object2.coordinator as any)._groupState?.playbackPosition
                    .targetPosition === 30
            );

            dispose();
        });

        it("should send 'positionUpdate' event regularly.", async () => {
            await start();
            let startOfTest = Date.now();
            const positionState: () => IMediaPlayerState = () => ({
                metadata: null,
                playbackState: "playing",
                positionState: {
                    position: (Date.now() - startOfTest) / 1000,
                },
                trackData: null,
            });
            let posUpdateCount = 0;
            const done = new Deferred();
            const scope1 = new LiveEventScope(
                // @ts-ignore-next-line
                object1.runtime,
                // @ts-ignore-next-line
                object1._liveRuntime
            );
            new LiveEventTarget(
                // @ts-ignore-next-line
                scope1,
                "positionUpdate",
                (event, local) => {
                    if (!local) return;

                    posUpdateCount += 1;
                    if (posUpdateCount > 6) {
                        done.resolve();
                    }
                }
            );

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
            await start();
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
            await start();

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
            await start();
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
            await start();
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
            await start(new TestMediaTimeStampProvider());

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
