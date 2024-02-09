/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import { GroupPlaybackTrack } from "../internals/GroupPlaybackTrack";
import { ExtendedMediaMetadata } from "../MediaSessionExtensions";
import { GroupPlaybackTrackData } from "../internals";

describe("GroupPlaybackTrackData", () => {
    const track1 = {
        trackIdentifier: "track1",
        title: "Test Track 1",
    } as ExtendedMediaMetadata;
    const track2 = {
        trackIdentifier: "track2",
        title: "Test Track 2",
    } as ExtendedMediaMetadata;

    it("updateData should return false for older events", () => {
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: { trackIdentifier: "src" } as ExtendedMediaMetadata,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });

        const trackData = new GroupPlaybackTrackData(playbackTrack);

        trackData.updateData(
            {
                data: { blah: "wow" },
                timestamp: 2,
                clientId: "",
            },
            "user"
        );

        assert(
            !trackData.updateData(
                {
                    data: { blah: "sup" },
                    timestamp: 1,
                    clientId: "",
                },
                "user"
            )
        );
    });

    it("updateData should return false for events that are the same time, but clientId is higher sort", () => {
        const playbackTrack = new GroupPlaybackTrack(() => {
            return {
                metadata: { trackIdentifier: "src" } as ExtendedMediaMetadata,
                playbackState: "none",
                positionState: undefined,
                trackData: null,
            };
        });

        const trackData = new GroupPlaybackTrackData(playbackTrack);

        trackData.updateData(
            {
                data: { blah: "wow" },
                timestamp: 2,
                clientId: "a",
            },
            "user"
        );

        assert(
            !trackData.updateData(
                {
                    data: { blah: "sup" },
                    timestamp: 2,
                    clientId: "b",
                },
                "user"
            )
        );
    });
});
