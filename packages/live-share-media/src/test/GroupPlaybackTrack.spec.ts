/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import { IParticipant, ParticipantRole, Deferred } from "@microsoft/teams-collaboration";
import { GroupPlaybackTrack, GroupPlaybackTrackEvents, ITrackChangeEvent } from "../internals/GroupPlaybackTrack";
import { ExtendedMediaMetadata } from "../MediaSessionExtensions";

describe("GroupPlaybackTrack", () => {
    const user1: IParticipant = { participantId: "user1", role: ParticipantRole.organizer };
    const user2: IParticipant = { participantId: "user2", role: ParticipantRole.participant };

    const track1 = { trackIdentifier: "track1", title: "Test Track 1" } as ExtendedMediaMetadata;
    const track2 = { trackIdentifier: "track2", title: "Test Track 2" } as ExtendedMediaMetadata;

    it('should fire "trackChange" event when no media', async () => {
        const done = new Deferred();
        const playbackTrack = new GroupPlaybackTrack(() => null);
        playbackTrack.addEventListener(GroupPlaybackTrackEvents.trackChange, (event: ITrackChangeEvent) => {
            try {
                assert(event.metadata, `no metadata`);
                assert(event.metadata.trackIdentifier == "track1", `wrong track`);
                done.resolve();
            } catch (err) {
                done.reject(err);
            }
        });

        await playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, socketId: "a" });

        await done.promise;
    });

    it("should switch tracks", async () => {
        let cnt = 0;
        let metadata: ExtendedMediaMetadata = null;
        const playbackTrack = new GroupPlaybackTrack(() => metadata);
        playbackTrack.addEventListener(GroupPlaybackTrackEvents.trackChange, (event: ITrackChangeEvent) => {
            cnt++;
            metadata = event.metadata;
        });

        await playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, socketId: "a" });
        await playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 2, socketId: "b" });
        assert(cnt == 2, `called trackChange event ${cnt} times`);
        assert(metadata.trackIdentifier == "track2", `wrong track set`);
    });

    it("should ignore track changes with older timestamps", async () => {
        let cnt = 0;
        let metadata: ExtendedMediaMetadata = null;
        const playbackTrack = new GroupPlaybackTrack(() => metadata);
        playbackTrack.addEventListener(GroupPlaybackTrackEvents.trackChange, (event: ITrackChangeEvent) => {
            cnt++;
            metadata = event.metadata;
        });

        await playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 3, socketId: "a" });
        await playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 2, socketId: "b" });
        assert(cnt == 1, `called trackChange event ${cnt} times`);
    });
});
