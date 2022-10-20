/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import {
    SimulatedBroadcastHub,
    SimulatedCollaborationSpace,
    IParticipant,
    ParticipantRole,
    Deferred,
} from "@microsoft/teams-collaboration";
import { ExtendedMediaMetadata } from "./MediaSessionExtensions";
import { ICurrentPlaybackPosition } from "./coordinatorState";
import { TestMediaSession } from "./SharedMediaSession.spec";

describe("SharedMediaSessionCoordinator", () => {
    const user1: IParticipant = {
        participantId: "user1",
        role: ParticipantRole.organizer,
    };
    const user2: IParticipant = {
        participantId: "user2",
        role: ParticipantRole.participant,
    };
    const testTrack: ExtendedMediaMetadata = {
        trackIdentifier: "https://example.org/test.mp3",
        title: "Test Title",
        album: "Test Album",
        artist: "The Testers",
        artwork: [],
    };
    const leaderPosition: Partial<ICurrentPlaybackPosition> = {
        playbackState: "playing",
        position: 25.0,
        duration: 600.0,
    };

    const laggerPosition: Partial<ICurrentPlaybackPosition> = {
        playbackState: "playing",
        position: 20.0,
        duration: 600.0,
    };

    it('should send "joined" event when joined.', async () => {
        const hub = new SimulatedBroadcastHub();
        const space1 = new SimulatedCollaborationSpace(user1, hub);
        const space2 = new SimulatedCollaborationSpace(user2, hub);

        try {
            let cnt = 0;
            const session = new TestMediaSession(space1);
            await space2.join();
            space2.socket.addBroadcastListener(
                session.name,
                "joined",
                async (event) => {
                    cnt++;
                }
            );

            await space1.join();
            assert(cnt == 1, `joined event not sent`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should send "positionUpdate" event regularly.', async () => {
        const hub = new SimulatedBroadcastHub();
        const space1 = new SimulatedCollaborationSpace(user1, hub);
        const space2 = new SimulatedCollaborationSpace(user2, hub);

        try {
            let cnt = 0;
            const done = new Deferred();
            const session = new TestMediaSession(space1, testTrack);
            session.coordinator.positionUpdateInterval = 0.02;
            await space2.join();
            space2.socket.addBroadcastListener(
                session.name,
                "positionUpdate",
                async (event) => {
                    cnt++;
                    if (cnt > 1) {
                        done.resolve();
                    }
                }
            );

            await session.coordinator.join();
            await session.coordinator.play();
            await done.promise;
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should broadcast "play" transport command.', async () => {
        const hub = new SimulatedBroadcastHub();
        const space1 = new SimulatedCollaborationSpace(user1, hub);
        const space2 = new SimulatedCollaborationSpace(user2, hub);

        try {
            const session1 = new TestMediaSession(space1, testTrack);
            const session2 = new TestMediaSession(space2, testTrack);

            await space1.join();
            await space2.join();

            // Listen for action
            const done = new Deferred();

            // Start playback
            await session1.coordinator.play();

            // Wait for action to be broadcast
            await session2.waitForAction(async (details) => {
                assert(details.action == "play", `wrong action received`);
            });
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should broadcast "pause" transport command.', async () => {
        const hub = new SimulatedBroadcastHub();
        const space1 = new SimulatedCollaborationSpace(user1, hub);
        const space2 = new SimulatedCollaborationSpace(user2, hub);

        try {
            const session1 = new TestMediaSession(space1, testTrack);
            const session2 = new TestMediaSession(space2, testTrack);

            await session1.coordinator.join();
            await space2.join();

            // Start playback
            await session1.coordinator.play();

            // Wait for action to be broadcast
            await session2.waitForAction(async (details) => {
                assert(details.action == "play", `didn't start playback`);

                // Pause playback
                await session1.coordinator.pause();
                await session2.waitForAction(async (details) => {
                    assert(details.action == "pause", `didn't pause playback`);
                });
            });
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should broadcast "seekTo" transport command.', async () => {
        const hub = new SimulatedBroadcastHub();
        const space1 = new SimulatedCollaborationSpace(user1, hub);
        const space2 = new SimulatedCollaborationSpace(user2, hub);

        try {
            const session1 = new TestMediaSession(space1, testTrack);
            const session2 = new TestMediaSession(space2, testTrack);

            await session1.coordinator.join();
            await space2.join();

            // Start playback
            await session1.coordinator.play();

            // Wait for action to be broadcast
            await session2.waitForAction(async (details) => {
                assert(details.action == "play", `didn't start playback`);

                // Seek to position
                await session1.coordinator.seekTo(2.3);
                await session2.waitForAction(async (details) => {
                    assert(
                        details.action == "seekto",
                        `wong action received "${details.action}"`
                    );
                    assert(
                        details.seekTime >= 2.3,
                        `wrong seek position "${details.seekTime}"`
                    );
                });
            });
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should broadcast "setTrack" transport command.', async () => {
        const hub = new SimulatedBroadcastHub();
        const space1 = new SimulatedCollaborationSpace(user1, hub);
        const space2 = new SimulatedCollaborationSpace(user2, hub);

        try {
            const session1 = new TestMediaSession(space1);
            const session2 = new TestMediaSession(space2);

            await space1.join();
            await space2.join();

            // Change tracks
            await session1.coordinator.setTrack(testTrack);

            // Wait for action to be broadcast
            await session2.waitForAction(async (details) => {
                assert(
                    details.action == "settrack",
                    `wrong action received "${details.action}"`
                );
                assert(
                    JSON.stringify(session1.metadata) ==
                        JSON.stringify(testTrack),
                    `session1 has wrong track: ${JSON.stringify(
                        session1.metadata
                    )}`
                );
                assert(
                    JSON.stringify(session2.metadata) ==
                        JSON.stringify(testTrack),
                    `session2 has wrong track: ${JSON.stringify(
                        session2.metadata
                    )}`
                );
            });
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    // it('should trigger "catchup" action.', async () => {
    //     const hub = new SimulatedBroadcastHub();
    //     const space1 = new SimulatedCollaborationSpace(user1, hub);
    //     const space2 = new SimulatedCollaborationSpace(user2, hub);

    //     try {
    //         const session1 = new TestMediaSession(testTrack, leaderPosition);
    //         const session1.coordinator = new SharedMediaSessionCoordinator(space1, session1, session1.name);
    //         session1.coordinator.positionUpdateInterval = 0.02;
    //         const session2 = new TestMediaSession(testTrack, laggerPosition);
    //         const coordinator2 = new SharedMediaSessionCoordinator(space2, session2, session2.name);
    //         coordinator2.positionUpdateInterval = 0.02;

    //         await session1.coordinator.join();
    //         await coordinator2.join();

    //         await session1.coordinator.play();

    //         // Wait for action to be broadcast
    //         session2.reset();
    //         await session2.waitForAction(async () => {
    //             assert(session2.isOutOfSync, `session2 should be out of sync`);
    //             assert(session2.targetPosition >= leaderPosition.position, `session2 returned target position of ${session2.targetPosition}`);
    //         });
    //     } finally {
    //         await space1.leave();
    //         await space2.leave();
    //     }
    // });
});
