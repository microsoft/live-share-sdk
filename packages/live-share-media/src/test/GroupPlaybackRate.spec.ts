/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import { GroupPlaybackRate } from "../internals";

describe("GroupPlaybackRate", () => {
    it("updatePlaybackRate should return false for older events", () => {
        const trackData = new GroupPlaybackRate();

        assert(
            trackData.updatePlaybackRate(
                {
                    playbackRate: 1.5,
                    timestamp: 2,
                    clientId: "",
                },
                "user"
            )
        );

        assert(
            !trackData.updatePlaybackRate(
                {
                    playbackRate: 2,
                    timestamp: 1,
                    clientId: "",
                },
                "user"
            )
        );
    });

    it("updatePlaybackRate should return false for events that are the same time, but clientId is higher sort", async () => {
        const rate = new GroupPlaybackRate();

        rate.updatePlaybackRate(
            {
                playbackRate: 1.5,
                timestamp: 2,
                clientId: "a",
            },
            "user"
        );

        assert(
            !rate.updatePlaybackRate(
                {
                    playbackRate: 2,
                    timestamp: 2,
                    clientId: "b",
                },
                "user"
            )
        );
    });
});
