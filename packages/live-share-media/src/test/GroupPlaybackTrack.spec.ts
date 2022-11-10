/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import { Deferred } from "@microsoft/live-share/src/test/Deferred";
import {
    GroupPlaybackTrack,
    GroupPlaybackTrackEvents,
    IPlaybackTrackChangeEvent,
} from "../internals/GroupPlaybackTrack";
import { IMediaPlayerState } from "../LiveMediaSessionCoordinator";
import { ExtendedMediaMetadata } from "../MediaSessionExtensions";

describe("GroupPlaybackTrack", () => {
    const track1 = {
        trackIdentifier: "track1",
        title: "Test Track 1",
    } as ExtendedMediaMetadata;
    const track2 = {
        trackIdentifier: "track2",
        title: "Test Track 2",
    } as ExtendedMediaMetadata;

    let nullMediaPlayerState: IMediaPlayerState = {
        metadata: null,
        trackData: null,
        playbackState: "playing",
    };

    let mediaPlayerState2: IMediaPlayerState = {
        metadata: track2,
        trackData: null,
        playbackState: "playing",
    };

    it('should fire "trackChange" event when no media', async () => {
        const done = new Deferred();
        const playbackTrack = new GroupPlaybackTrack(
            () => nullMediaPlayerState
        );
        playbackTrack.addListener(
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
        let mediaPlayerState = mediaPlayerState2;
        const playbackTrack = new GroupPlaybackTrack(() => mediaPlayerState);
        playbackTrack.addListener(
            GroupPlaybackTrackEvents.trackChange,
            (event: IPlaybackTrackChangeEvent) => {
                cnt++;
                mediaPlayerState.metadata = event.metadata;
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
            clientId: "a",
        });
        assert(cnt == 2, `called trackChange event ${cnt} times`);
        assert(
            mediaPlayerState.metadata?.trackIdentifier == "track2",
            `wrong track set`
        );
    });

    it("should ignore track changes with older timestamps", async () => {
        let cnt = 0;
        let mediaPlayerState = nullMediaPlayerState;
        const playbackTrack = new GroupPlaybackTrack(() => mediaPlayerState);
        playbackTrack.addListener(
            GroupPlaybackTrackEvents.trackChange,
            (event: IPlaybackTrackChangeEvent) => {
                cnt++;
                mediaPlayerState.metadata = event.metadata;
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
});
