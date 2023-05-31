/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import "mocha";
import { strict as assert } from "assert";
import {
    CoordinationWaitPoint,
    ExtendedMediaMetadata,
    ExtendedMediaSessionPlaybackState,
} from "../MediaSessionExtensions";
import {
    GroupPlaybackPosition,
    GroupPlaybackTrack,
    GroupTransportState,
    ICurrentPlaybackPosition,
    ITransportState,
} from "../internals";
import {
    IRuntimeSignaler,
    TestLiveShareHost,
    TimeInterval,
} from "@microsoft/live-share";
import { MockLiveShareRuntime } from "@microsoft/live-share/src/test/MockLiveShareRuntime";
import { IMediaPlayerState } from "../LiveMediaSessionCoordinator";

function createTransportUpdate(
    runtime: IRuntimeSignaler,
    liveRuntime: MockLiveShareRuntime,
    playbackState: ExtendedMediaSessionPlaybackState,
    startPosition: number
): ITransportState {
    return {
        playbackState: playbackState,
        startPosition: startPosition,
        timestamp: liveRuntime.getTimestamp(),
        clientId: runtime.clientId!,
    };
}

function createPositionUpdate(
    runtime: IRuntimeSignaler,
    liveRuntime: MockLiveShareRuntime,
    playbackState: ExtendedMediaSessionPlaybackState,
    position: number,
    waitPoint?: CoordinationWaitPoint,
    duration?: number
): ICurrentPlaybackPosition {
    return {
        playbackState: playbackState,
        waitPoint: waitPoint,
        position: position,
        duration: duration,
        timestamp: liveRuntime.getTimestamp(),
        clientId: runtime.clientId!,
    };
}

function subtractSeconds<T extends { timestamp: number }>(
    seconds: number,
    update: T
): T {
    update.timestamp -= seconds * 1000;
    return update;
}

function addSeconds<T extends { timestamp: number }>(
    seconds: number,
    update: T
): T {
    update.timestamp += seconds * 1000;
    return update;
}

class MockRuntimeSignaler {
    constructor(public clientId: string | undefined) {}
}

async function getObjects(updateInterval: number = 10000) {
    const host = TestLiveShareHost.create();
    let liveRuntime = new MockLiveShareRuntime(false, updateInterval, host);

    let runtime1 = new MockRuntimeSignaler("1") as IRuntimeSignaler;
    let runtime2 = new MockRuntimeSignaler("2") as IRuntimeSignaler;

    await liveRuntime.start();

    const dispose = () => {
        liveRuntime.stop();
    };
    return {
        liveRuntime,
        runtime1,
        runtime2,
        dispose,
    };
}

async function getPlayBackPosition(
    liveRuntime: MockLiveShareRuntime,
    runtime1: IRuntimeSignaler,
    updateInterval = new TimeInterval(10)
) {
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
    const playbackTrack = new GroupPlaybackTrack(getMediaPlayerState);
    const transportState = new GroupTransportState(
        playbackTrack,
        getMediaPlayerState,
        liveRuntime
    );
    const playbackPosition = new GroupPlaybackPosition(
        transportState,
        runtime1,
        liveRuntime,
        updateInterval
    );

    return { playbackPosition, transportState };
}

describe("GroupPlaybackPosition", () => {
    it("should start with 0 clients", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1
        );

        try {
            assert(playbackPosition.totalClients == 0, `wrong client count`);
            assert(
                playbackPosition.localPosition == undefined,
                `wrong position`
            );
        } finally {
            dispose();
        }
    });

    it("should find local position", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1
        );

        try {
            playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime1, liveRuntime, "none", 0.0)
            );

            assert(playbackPosition.totalClients == 1, `wrong client count`);
            assert(
                playbackPosition.localPosition != undefined,
                `local position not found`
            );
        } finally {
            dispose();
        }
    });

    it("should update local position", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1
        );

        try {
            const position = createPositionUpdate(
                runtime1,
                liveRuntime,
                "none",
                0.0
            );
            await playbackPosition.UpdatePlaybackPosition(position);

            const newPosition = addSeconds(
                1.0,
                createPositionUpdate(runtime1, liveRuntime, "none", 0.0)
            );
            await playbackPosition.UpdatePlaybackPosition(newPosition);

            assert(playbackPosition.totalClients == 1, `wrong client count`);
            assert(
                playbackPosition.localPosition != undefined,
                `local position not found`
            );
            assert(
                playbackPosition.localPosition.timestamp ==
                    newPosition.timestamp,
                `position not updated`
            );
        } finally {
            dispose();
        }
    });

    it("should ignore older position updates", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1
        );

        try {
            const position = createPositionUpdate(
                runtime1,
                liveRuntime,
                "none",
                0.0
            );
            await playbackPosition.UpdatePlaybackPosition(position);

            const newPosition = subtractSeconds(
                1.0,
                createPositionUpdate(runtime1, liveRuntime, "none", 0.0)
            );
            await playbackPosition.UpdatePlaybackPosition(newPosition);

            assert(playbackPosition.totalClients == 1, `wrong client count`);
            assert(
                playbackPosition.localPosition != undefined,
                `local position not found`
            );
            assert(
                playbackPosition.localPosition.timestamp == position.timestamp,
                `position not updated`
            );
        } finally {
            dispose();
        }
    });

    it("should track other client positions", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1
        );

        try {
            const position1 = createPositionUpdate(
                runtime1,
                liveRuntime,
                "none",
                0.0
            );
            await playbackPosition.UpdatePlaybackPosition(position1);

            const position2 = addSeconds(
                1.0,
                createPositionUpdate(runtime2, liveRuntime, "none", 0.0)
            );
            await playbackPosition.UpdatePlaybackPosition(position2);

            assert(playbackPosition.totalClients == 2, `wrong client count`);
            assert(
                playbackPosition.localPosition != undefined,
                `local position not found`
            );
            assert(
                playbackPosition.localPosition.timestamp == position1.timestamp,
                `position not updated`
            );
        } finally {
            dispose();
        }
    });

    it("should enumerate client positions", async () => {
        const updateInterval = new TimeInterval(10);
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            updateInterval
        );

        try {
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime1, liveRuntime, "none", 0.0)
            );
            await playbackPosition.UpdatePlaybackPosition(
                subtractSeconds(
                    updateInterval.seconds,
                    createPositionUpdate(runtime2, liveRuntime, "none", 0.0)
                )
            );

            let cnt = 0;
            playbackPosition.forEach((position, projectedPosition) => {
                assert(
                    position.position == 0.0,
                    `wrong position ${position.position}`
                );
                assert(
                    projectedPosition == 0.0,
                    `wrong projected position ${projectedPosition}`
                );
                cnt++;
            });

            assert(cnt == 2, `only enumerated ${cnt} positions`);
        } finally {
            dispose();
        }
    });

    it("should ignore stale positions", async () => {
        const updateInterval = new TimeInterval(10);
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            updateInterval
        );

        try {
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime1, liveRuntime, "none", 0.0)
            );
            await playbackPosition.UpdatePlaybackPosition(
                subtractSeconds(
                    updateInterval.seconds * 3,
                    createPositionUpdate(runtime2, liveRuntime, "none", 0.0)
                )
            );

            let cnt = 0;
            playbackPosition.forEach((position, projectedPosition) => {
                assert(
                    position.position == 0.0,
                    `wrong position ${position.position}`
                );
                assert(
                    projectedPosition == 0.0,
                    `wrong projected position ${projectedPosition}`
                );
                cnt++;
            });

            assert(cnt == 1, `enumerated ${cnt} positions`);
        } finally {
            dispose();
        }
    });

    it("should project position when playing", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            new TimeInterval(1000)
        );

        try {
            playbackPosition.UpdatePlaybackPosition(
                subtractSeconds(
                    1.0,
                    createPositionUpdate(runtime1, liveRuntime, "playing", 0.0)
                )
            );

            let cnt = 0;
            playbackPosition.forEach((position, projectedPosition) => {
                assert(
                    position.position == 0.0,
                    `wrong position ${position.position}`
                );
                assert(
                    projectedPosition >= 1.0,
                    `wrong projected position ${projectedPosition}`
                );
                cnt++;
            });

            assert(cnt == 1, `enumerated ${cnt} positions`);
        } finally {
            dispose();
        }
    });

    it("should compute max playback position relative to transport state", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition, transportState } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            new TimeInterval(1000)
        );

        try {
            assert(
                playbackPosition.maxPosition == 0.0,
                `wrong starting position of ${playbackPosition.maxPosition}`
            );

            await transportState.updateState(
                subtractSeconds(
                    2.0,
                    createTransportUpdate(runtime1, liveRuntime, "playing", 0.0)
                )
            );

            assert(
                playbackPosition.maxPosition >= 2.0,
                `wrong projected position of ${playbackPosition.maxPosition}`
            );
        } finally {
            dispose();
        }
    });

    it("should compute target position relative to other client positions", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition, transportState } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            new TimeInterval(1000)
        );

        try {
            assert(
                playbackPosition.targetPosition == 0.0,
                `wrong starting position of ${playbackPosition.targetPosition}`
            );

            await transportState.updateState(
                subtractSeconds(
                    2.0,
                    createTransportUpdate(runtime1, liveRuntime, "playing", 0.0)
                )
            );
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime1, liveRuntime, "playing", 0.0)
            );
            await playbackPosition.UpdatePlaybackPosition(
                subtractSeconds(
                    1.0,
                    createPositionUpdate(runtime2, liveRuntime, "playing", 0.0)
                )
            );

            // We're sometimes getting back a target position of 0.999 instead of 1.0 (some sort of rounding error)
            assert(
                playbackPosition.targetPosition > 0.9 &&
                    playbackPosition.targetPosition < 2.0,
                `wrong target position of ${playbackPosition.targetPosition}`
            );
        } finally {
            dispose();
        }
    });

    it("should limit max and target position by media duration", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition, transportState } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            new TimeInterval(1000)
        );

        try {
            await transportState.updateState(
                subtractSeconds(
                    2.0,
                    createTransportUpdate(runtime1, liveRuntime, "playing", 0.0)
                )
            );
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(
                    runtime1,
                    liveRuntime,
                    "playing",
                    0.0,
                    undefined,
                    0.5
                )
            );
            await playbackPosition.UpdatePlaybackPosition(
                subtractSeconds(
                    1.0,
                    createPositionUpdate(
                        runtime2,
                        liveRuntime,
                        "playing",
                        0.0,
                        undefined,
                        0.5
                    )
                )
            );

            assert(
                playbackPosition.maxPosition == 0.5,
                `wrong max position ${playbackPosition.maxPosition}`
            );
            assert(
                playbackPosition.targetPosition == 0.5,
                `wrong target position ${playbackPosition.targetPosition}`
            );
        } finally {
            dispose();
        }
    });

    it("should count number of waiting clients", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition, transportState } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            new TimeInterval(1000)
        );

        try {
            await transportState.updateState(
                subtractSeconds(
                    2.0,
                    createTransportUpdate(runtime1, liveRuntime, "playing", 0.0)
                )
            );
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime1, liveRuntime, "suspended", 2.0, {
                    position: 2.0,
                })
            );
            await playbackPosition.UpdatePlaybackPosition(
                subtractSeconds(
                    1.0,
                    createPositionUpdate(
                        runtime2,
                        liveRuntime,
                        "playing",
                        0.0,
                        undefined
                    )
                )
            );

            assert(
                playbackPosition.clientsWaiting == 2,
                `wrong count ${playbackPosition.clientsWaiting}`
            );
        } finally {
            dispose();
        }
    });

    it("should drop waiting count after suspension ends", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition, transportState } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            new TimeInterval(1000)
        );

        try {
            await transportState.updateState(
                subtractSeconds(
                    2.0,
                    createTransportUpdate(runtime1, liveRuntime, "playing", 0.0)
                )
            );
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime1, liveRuntime, "waiting", 2.0, {
                    position: 2.0,
                })
            );
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime2, liveRuntime, "suspended", 2.0, {
                    position: 2.0,
                })
            );

            assert(
                playbackPosition.clientsWaiting == 1,
                `wrong count ${playbackPosition.clientsWaiting}`
            );
        } finally {
            dispose();
        }
    });

    it("should drop waiting count to 0 after all clients reach wait point", async () => {
        const { liveRuntime, runtime1, runtime2, dispose } = await getObjects();
        const { playbackPosition, transportState } = await getPlayBackPosition(
            liveRuntime,
            runtime1,
            new TimeInterval(1000)
        );

        try {
            await transportState.updateState(
                subtractSeconds(
                    2.0,
                    createTransportUpdate(runtime1, liveRuntime, "playing", 0.0)
                )
            );
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime1, liveRuntime, "waiting", 2.0, {
                    position: 2.0,
                })
            );
            await playbackPosition.UpdatePlaybackPosition(
                createPositionUpdate(runtime2, liveRuntime, "waiting", 2.0, {
                    position: 2.0,
                })
            );

            assert(
                playbackPosition.clientsWaiting == 0,
                `wrong count ${playbackPosition.clientsWaiting}`
            );
        } finally {
            dispose();
        }
    });
});
