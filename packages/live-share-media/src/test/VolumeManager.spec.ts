import { strict as assert } from "assert";
import { IMediaPlayer } from "../IMediaPlayer"
import { LevelType, VolumeManager } from "../VolumeManager"
import { Deferred } from '@microsoft/live-share/src/test/Deferred';

describe('VolumeManager', () => {
    it('should ramp down volume', async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0
        const volumeManager = new VolumeManager(player);

        assert(player.volume == 1.0);
        volumeManager.start();
        setTimeout(() => {
            // check volume at halfway point
            assert(player.volume > 0.4);
            assert(player.volume < 0.6);
        }, volumeManager.volumeChangeDuration * 1000 / 2);

        setTimeout(() => {
            // check volume at end with 20ms of leeway
            assert(player.volume == volumeManager.level);
            testAwait.resolve();
        }, volumeManager.volumeChangeDuration * 1000 + 20);

        await testAwait.promise;
    });

    it('should ramp up volume', async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0
        const volumeManager = new VolumeManager(player);

        // limit at start
        volumeManager.start();

        // when limited all the way, test ramp up
        setTimeout(() => {
            assert(player.volume == volumeManager.level);
            volumeManager.stop();

            setTimeout(() => {
                // check volume at halfway point
                assert(player.volume > 0.4);
                assert(player.volume < 0.6);
            }, volumeManager.volumeChangeDuration * 1000 / 2);

            setTimeout(() => {
                // check volume at end with 20ms of leeway
                assert(player.volume == volumeManager.selectedVolume);
                testAwait.resolve();
            }, volumeManager.volumeChangeDuration * 1000 + 20);

        }, volumeManager.volumeChangeDuration * 1000 + 20);

        await testAwait.promise;
    });

    it('should ramp down halfway, then ramp up', async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0

        const volumeManager = new VolumeManager(player);

        volumeManager.start();
        setTimeout(() => {
            // check volume at halfway point, begin ramping other direction
            assert(player.volume > 0.4);
            assert(player.volume < 0.6);
            volumeManager.stop();

            setTimeout(() => {
                // check volume at end with 20ms of leeway
                assert(player.volume == volumeManager.selectedVolume);
                testAwait.resolve();
            }, volumeManager.volumeChangeDuration * 1000 + 20);

        }, volumeManager.volumeChangeDuration * 1000 / 2);

        await testAwait.promise;
    });

    it('ramp using selected volume', async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0

        const volumeManager = new VolumeManager(player);

        volumeManager.selectedVolume = 0.3;
        setTimeout(() => {
            // check volume at halfway point
            assert(player.volume > 0.6);
            assert(player.volume < 0.7);
        }, volumeManager.volumeChangeDuration * 1000 / 2);

        setTimeout(() => {
            // check volume at end with 20ms of leeway
            assert(player.volume == volumeManager.selectedVolume);
            testAwait.resolve();
        }, volumeManager.volumeChangeDuration * 1000 + 20);

        await testAwait.promise;
    });

    it('enable limit, change selected volume, then disable limit', async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0
        const volumeManager = new VolumeManager(player);

        volumeManager.start();
        setTimeout(() => {
            // check volume at halfway point, begin ramping other direction with lower selected volume
            assert(player.volume > 0.4);
            assert(player.volume < 0.6);

            volumeManager.selectedVolume = 0.7;
            volumeManager.stop();

            setTimeout(() => {
                // check volume at end with 20ms of leeway
                assert(player.volume === volumeManager.selectedVolume);
                testAwait.resolve();
            }, volumeManager.volumeChangeDuration * 1000 + 20);

        }, volumeManager.volumeChangeDuration * 1000 / 2);

        await testAwait.promise;
    });

    it('ramp down with selected volume to 0.3, then up to 0.8', async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0

        const volumeManager = new VolumeManager(player);
        volumeManager.selectedVolume = 0.3;

        setTimeout(() => {
            // check volume at halfway point
            assert(player.volume > 0.6);
            assert(player.volume < 0.7);
            volumeManager.selectedVolume = 0.8;

            setTimeout(() => {
                // check volume at end with 20ms of leeway
                assert(player.volume == volumeManager.selectedVolume);
                testAwait.resolve();
            }, volumeManager.volumeChangeDuration * 1000 + 20);
        }, volumeManager.volumeChangeDuration * 1000 / 2);

        await testAwait.promise;
    });

    it('test 50% limiting', async () => {
        const testAwait = new Deferred();
        const player = new TestMediaPlayer();
        player.volume = 1.0

        const volumeManager = new VolumeManager(player);
        volumeManager.levelType = LevelType.percentage;
        volumeManager.level = 0.5;

        volumeManager.start();

        setTimeout(() => {
            // check volume at halfway point
            assert(player.volume > 0.7);
            assert(player.volume < 0.8);
        }, volumeManager.volumeChangeDuration * 1000 / 2);

        setTimeout(() => {
            // check volume at end with 20ms of leeway
            assert(player.volume == volumeManager.level * volumeManager.selectedVolume);
            testAwait.resolve();
        }, volumeManager.volumeChangeDuration * 1000 + 20);

        await testAwait.promise;
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
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void {
        throw new Error("Method not implemented.");
    }
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void {
        throw new Error("Method not implemented.");
    }
}
