import { strict as assert } from "assert";
import { IMediaPlayer } from "../IMediaPlayer";
import { LimitLevelType, VolumeManager } from "../VolumeManager";
import { Deferred, waitForDelay } from "@microsoft/live-share/src/internals";

// few millis more than max timeout callback in scheduleAnimationFrame
const milliTolerance = 25;
const volumeChangeDuration = 0.5;

describe("VolumeManager", () => {
    it("should ramp down volume", async () => {
        const player = new TestMediaPlayer();
        player.volume = 1.0;
        const volumeManager = new VolumeManager(player);
        volumeManager.volumeChangeDuration = volumeChangeDuration;

        assert(player.volume == 1.0);
        volumeManager.startLimiting();

        await waitForDelay((volumeManager.volumeChangeDuration * 1000) / 2);
        // check volume at halfway point
        assert(player.volume > 0.4);
        assert(player.volume < 0.6);

        // check volume at end with milliTolerance of leeway
        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );
        assert(player.volume == volumeManager.limitLevel);
    });

    it("should ramp up volume", async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0;
        const volumeManager = new VolumeManager(player);
        volumeManager.volumeChangeDuration = volumeChangeDuration;

        // limit at start
        volumeManager.startLimiting();

        // when limited all the way, test ramp up
        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );

        assert(player.volume == volumeManager.limitLevel);
        volumeManager.stopLimiting();

        setTimeout(() => {
            // check volume at halfway point
            assert(player.volume > 0.4);
            assert(player.volume < 0.6);
        }, (volumeManager.volumeChangeDuration * 1000) / 2);

        // check volume at end with milliTollerance of leeway
        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );
        assert(player.volume == volumeManager.volume);
    });

    it("should ramp down halfway, then ramp up", async () => {
        const player = new TestMediaPlayer();
        player.volume = 1.0;

        const volumeManager = new VolumeManager(player);
        volumeManager.volumeChangeDuration = volumeChangeDuration;

        volumeManager.startLimiting();
        await waitForDelay((volumeManager.volumeChangeDuration * 1000) / 2);
        // check volume at halfway point, begin ramping other direction
        assert(player.volume > 0.4);
        assert(player.volume < 0.6);
        volumeManager.stopLimiting();

        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );
        // check volume at end with milliTolerance of leeway
        assert(player.volume == volumeManager.volume);
    });

    it("ramp using selected volume", async () => {
        const player = new TestMediaPlayer();
        player.volume = 1.0;

        const volumeManager = new VolumeManager(player);
        volumeManager.volumeChangeDuration = volumeChangeDuration;

        volumeManager.volume = 0.3;
        setTimeout(() => {
            // check volume at halfway point
            assert(player.volume > 0.6);
            assert(player.volume < 0.7);
        }, (volumeManager.volumeChangeDuration * 1000) / 2);

        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );
        // check volume at end with milliTolerance of leeway
        assert(player.volume == volumeManager.volume);
    });

    it("enable limit, change selected volume, then disable limit", async () => {
        const player = new TestMediaPlayer();
        player.volume = 1.0;
        const volumeManager = new VolumeManager(player);
        volumeManager.volumeChangeDuration = volumeChangeDuration;

        volumeManager.startLimiting();
        await waitForDelay((volumeManager.volumeChangeDuration * 1000) / 2);
        // check volume at halfway point, begin ramping other direction with lower selected volume
        assert(player.volume > 0.4);
        assert(player.volume < 0.6);

        volumeManager.volume = 0.7;
        volumeManager.stopLimiting();

        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );
        // check volume at end with milliTolerance of leeway
        assert(player.volume == volumeManager.volume);
    });

    it("ramp down with selected volume to 0.3, then up to 0.8", async () => {
        const player = new TestMediaPlayer();
        player.volume = 1.0;

        const volumeManager = new VolumeManager(player);
        volumeManager.volumeChangeDuration = volumeChangeDuration;
        volumeManager.volume = 0.3;

        await waitForDelay((volumeManager.volumeChangeDuration * 1000) / 2);

        // check volume at halfway point
        assert(player.volume > 0.55);
        assert(player.volume < 0.75);
        volumeManager.volume = 0.8;

        // check volume at end with milliTolerance of leeway
        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );
        assert(player.volume == volumeManager.volume);
    });

    it("test 50% limiting", async () => {
        const player = new TestMediaPlayer();
        player.volume = 1.0;

        const volumeManager = new VolumeManager(player);
        volumeManager.volumeChangeDuration = volumeChangeDuration;
        volumeManager.limitLevelType = LimitLevelType.percentage;
        volumeManager.limitLevel = 0.5;

        volumeManager.startLimiting();

        setTimeout(() => {
            // check volume at halfway point
            assert(player.volume > 0.7);
            assert(player.volume < 0.8);
        }, (volumeManager.volumeChangeDuration * 1000) / 2);

        // check volume at end with milliTolerance of leeway
        await waitForDelay(
            volumeManager.volumeChangeDuration * 1000 + milliTolerance
        );
        assert(
            player.volume == volumeManager.limitLevel * volumeManager.volume
        );
    });
});

// test implementation
class TestMediaPlayer implements IMediaPlayer {
    currentSrc: string;
    currentTime: number;
    duration: number;
    ended: boolean;
    muted: boolean;
    paused: boolean;
    playbackRate: number;
    src: string;
    volume: number;
    load(): void {
        throw new Error("Method not implemented.");
    }
    pause(): void {
        throw new Error("Method not implemented.");
    }
    play(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions | undefined
    ): void {
        throw new Error("Method not implemented.");
    }
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions | undefined
    ): void {
        throw new Error("Method not implemented.");
    }
}
