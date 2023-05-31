/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import {
    GroupPlaybackTrack,
    GroupPlaybackTrackEvents,
    IPlaybackTrackChangeEvent,
} from "../internals/GroupPlaybackTrack";
import { ExtendedMediaMetadata } from "../MediaSessionExtensions";
import { Deferred } from "@microsoft/live-share/src/internals/Deferred";

describe("GroupPlaybackTrack", () => {
    const track1 = {
        trackIdentifier: "track1",
        title: "Test Track 1",
    } as ExtendedMediaMetadata;
    const track2 = {
        trackIdentifier: "track2",
        title: "Test Track 2",
    } as ExtendedMediaMetadata;

    it('should fire "trackChange" event when no media', async () => {
        const done = new Deferred();
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: { trackIdentifier: "src" } as ExtendedMediaMetadata,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });
        playbackTrack.on(
            GroupPlaybackTrackEvents.trackChange,
            (event: IPlaybackTrackChangeEvent) => {
                try {
                    assert(event.metadata, `no metadata`);
                    assert(
                        event.metadata.trackIdentifier == "track1",
                        `wrong track`
                    );
                    done.resolve();
                } catch (err) {
                    done.reject(err);
                }
            }
        );

        await playbackTrack.updateTrack({
            metadata: track1,
            waitPoints: [],
            timestamp: 1,
            clientId: "a",
        });

        await done.promise;
    });

    it("should switch tracks", async () => {
        let cnt = 0;
        let metadata: ExtendedMediaMetadata | null = null;
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: null,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });
        playbackTrack.on(
            GroupPlaybackTrackEvents.trackChange,
            (event: IPlaybackTrackChangeEvent) => {
                cnt++;
                metadata = event.metadata;
            }
        );

        await playbackTrack.updateTrack({
            metadata: track1,
            waitPoints: [],
            timestamp: 1,
            clientId: "a",
        });
        await playbackTrack.updateTrack({
            metadata: track2,
            waitPoints: [],
            timestamp: 2,
            clientId: "b",
        });
        assert(cnt == 2, `called trackChange event ${cnt} times`);
        assert(metadata!.trackIdentifier == "track2", `wrong track set`);
    });

    it("should ignore track changes with older timestamps", async () => {
        let cnt = 0;
        let metadata: ExtendedMediaMetadata | null = null;
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: null,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });
        playbackTrack.on(
            GroupPlaybackTrackEvents.trackChange,
            (event: IPlaybackTrackChangeEvent) => {
                cnt++;
                metadata = event.metadata;
            }
        );

        await playbackTrack.updateTrack({
            metadata: track1,
            waitPoints: [],
            timestamp: 3,
            clientId: "a",
        });
        await playbackTrack.updateTrack({
            metadata: track2,
            waitPoints: [],
            timestamp: 2,
            clientId: "b",
        });
        assert(cnt == 1, `called trackChange event ${cnt} times`);
    });

    it("should insert waitpoint if no existing waitpoints", async () => {
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: null,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });
        playbackTrack.addWaitPoint({ position: 10 });
        assert(playbackTrack.findNextWaitPoint(undefined)?.position === 10);
    });

    it("should insert waitpoints in correct order", async () => {
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: null,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });

        await playbackTrack.updateTrack({
            metadata: track1,
            waitPoints: [{ position: 30 }],
            timestamp: 1,
            clientId: "a",
        });
        playbackTrack.addWaitPoint({ position: 10 });
        assert(playbackTrack.findNextWaitPoint(undefined)?.position === 10);
    });

    it("updateTrack should return false for events that are the same time, but clientId is higher sort", async () => {
        const done = new Deferred();
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: { trackIdentifier: "src" } as ExtendedMediaMetadata,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });

        playbackTrack.updateTrack({
            metadata: track1,
            waitPoints: [],
            timestamp: 3,
            clientId: "a",
        });

        assert(
            !playbackTrack.updateTrack({
                metadata: track1,
                waitPoints: [],
                timestamp: 3,
                clientId: "b",
            })
        );
    });
});
