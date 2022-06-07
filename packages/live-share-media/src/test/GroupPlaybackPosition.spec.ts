/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import 'mocha';
import { strict as assert } from 'assert';
import { TimeInterval } from '@microsoft/live-share';
import { GroupPlaybackTrack, GroupTransportState, GroupPlaybackPosition } from '../internals';
import { ExtendedMediaMetadata } from '../MediaSessionExtensions';
import { MockRuntimeSignaler } from './MockRuntimeSignaler';
import * as TestUtils from './TestUtils';


describe('GroupPlaybackPosition', () => {
    const runtime1 = new MockRuntimeSignaler();
    const runtime2 = new MockRuntimeSignaler();

    const track1 = { trackIdentifier: 'track1', title: 'Test Track 1' } as ExtendedMediaMetadata;
    const track2 = { trackIdentifier: 'track2', title: 'Test Track 2' } as ExtendedMediaMetadata;

    const updateInterval = new TimeInterval(10);

    it('should start with 0 clients', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, updateInterval);

        assert(playbackPosition.totalClients == 0, `wrong client count`);
        assert(playbackPosition.localPosition == undefined, `wrong position`);
    });

    it('should find local position', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, updateInterval);

        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'none', 0.0));

        assert(playbackPosition.totalClients == 1, `wrong client count`);
        assert(playbackPosition.localPosition != undefined, `local position not found`);
        assert(playbackPosition.localPosition.position == 0.0, `local position was ${playbackPosition.localPosition.position}`);
    });

    it('should update local position', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, updateInterval);

        const position = TestUtils.createPositionUpdate(runtime1, 'none', 0.0);
        playbackPosition.UpdatePlaybackPosition(position);

        const newPosition = TestUtils.addSeconds(1.0, TestUtils.createPositionUpdate(runtime1, 'none', 0.0));
        playbackPosition.UpdatePlaybackPosition(newPosition);

        assert(playbackPosition.totalClients == 1, `wrong client count`);
        assert(playbackPosition.localPosition != undefined, `local position not found`);
        assert(playbackPosition.localPosition.timestamp == newPosition.timestamp, `position not updated`);
    });

    it('should ignore older position updates', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, updateInterval);

        const position = TestUtils.createPositionUpdate(runtime1, 'none', 0.0);
        playbackPosition.UpdatePlaybackPosition(position);

        const newPosition = TestUtils.subtractSeconds(1.0, TestUtils.createPositionUpdate(runtime1, 'none', 0.0));
        playbackPosition.UpdatePlaybackPosition(newPosition);

        assert(playbackPosition.totalClients == 1, `wrong client count`);
        assert(playbackPosition.localPosition != undefined, `local position not found`);
        assert(playbackPosition.localPosition.timestamp == position.timestamp, `position not updated`);
    });

    it('should track other client positions', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, updateInterval);


        const position1 = TestUtils.createPositionUpdate(runtime1, 'none', 0.0);
        playbackPosition.UpdatePlaybackPosition(position1);

        const position2 = TestUtils.addSeconds(1.0, TestUtils.createPositionUpdate(runtime2, 'none', 0.0));
        playbackPosition.UpdatePlaybackPosition(position2);

        assert(playbackPosition.totalClients == 2, `wrong client count`);
        assert(playbackPosition.localPosition != undefined, `local position not found`);
        assert(playbackPosition.localPosition.timestamp == position1.timestamp, `position not updated`);
    });

    it('should enumerate client positions', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, updateInterval);

        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'none', 0.0));
        playbackPosition.UpdatePlaybackPosition(TestUtils.subtractSeconds(updateInterval.seconds, TestUtils.createPositionUpdate(runtime2, 'none', 0.0)));

        let cnt = 0;
        playbackPosition.forEach((position, projectedPosition) => {
            assert(position.position == 0.0, `wrong position ${position.position}`);
            assert(projectedPosition == 0.0, `wrong projected position ${projectedPosition}`);
            cnt++;
        });

        assert(cnt == 2, `only enumerated ${cnt} positions`);
    });

    it('should ignore stale positions', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, updateInterval);

        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'none', 0.0));
        playbackPosition.UpdatePlaybackPosition(TestUtils.subtractSeconds(updateInterval.seconds * 3, TestUtils.createPositionUpdate(runtime2, 'none', 0.0)));

        let cnt = 0;
        playbackPosition.forEach((position, projectedPosition) => {
            assert(position.position == 0.0, `wrong position ${position.position}`);
            assert(projectedPosition == 0.0, `wrong projected position ${projectedPosition}`);
            cnt++;
        });

        assert(cnt == 1, `enumerated ${cnt} positions`);
    });

    it('should project position when playing', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, new TimeInterval(1000));

        playbackPosition.UpdatePlaybackPosition(TestUtils.subtractSeconds(1.0, TestUtils.createPositionUpdate(runtime1, 'playing', 0.0)));

        let cnt = 0;
        playbackPosition.forEach((position, projectedPosition) => {
            assert(position.position == 0.0, `wrong position ${position.position}`);
            assert(projectedPosition >= 1.0, `wrong projected position ${projectedPosition}`);
            cnt++;
        });

        assert(cnt == 1, `enumerated ${cnt} positions`);
    });

    it('should compute max playback position relative to transport state', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, new TimeInterval(1000));

        assert(playbackPosition.maxPosition == 0.0, `wrong starting position of ${playbackPosition.maxPosition}`);

        transportState.updateState(TestUtils.subtractSeconds(2.0, TestUtils.createTransportUpdate(runtime1, 'playing', 0.0)));

        assert(playbackPosition.maxPosition >= 2.0, `wrong projected position of ${playbackPosition.maxPosition}`);
    });

    it('should compute target position relative to other client positions', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, new TimeInterval(1000));

        assert(playbackPosition.targetPosition == 0.0, `wrong starting position of ${playbackPosition.targetPosition}`);

        transportState.updateState(TestUtils.subtractSeconds(2.0, TestUtils.createTransportUpdate(runtime1, 'playing', 0.0)));
        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'playing', 0.0));
        playbackPosition.UpdatePlaybackPosition(TestUtils.subtractSeconds(1.0, TestUtils.createPositionUpdate(runtime2, 'playing', 0.0)));

        // We're sometimes getting back a target position of 0.999 instead of 1.0 (some sort of rounding error)
        assert(playbackPosition.targetPosition > 0.9 && playbackPosition.targetPosition < 2.0, `wrong target position of ${playbackPosition.targetPosition}`);
    });

    it('should limit max and target position by media duration', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, new TimeInterval(1000));

        transportState.updateState(TestUtils.subtractSeconds(2.0, TestUtils.createTransportUpdate(runtime1, 'playing', 0.0)));
        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'playing', 0.0, undefined, 0.5));
        playbackPosition.UpdatePlaybackPosition(TestUtils.subtractSeconds(1.0, TestUtils.createPositionUpdate(runtime2, 'playing', 0.0, undefined, 0.5)));

        assert(playbackPosition.maxPosition == 0.5, `wrong max position ${playbackPosition.maxPosition}`);
        assert(playbackPosition.targetPosition == 0.5, `wrong target position ${playbackPosition.targetPosition}`);
    });

    it('should count number of waiting clients', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, new TimeInterval(1000));

        transportState.updateState(TestUtils.subtractSeconds(2.0, TestUtils.createTransportUpdate(runtime1, 'playing', 0.0)));
        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'suspended', 2.0, { position: 2.0 }));
        playbackPosition.UpdatePlaybackPosition(TestUtils.subtractSeconds(1.0, TestUtils.createPositionUpdate(runtime2, 'playing', 0.0, undefined)));

        assert(playbackPosition.clientsWaiting == 2, `wrong count ${playbackPosition.clientsWaiting}`);
    });

    it('should drop waiting count after suspension ends', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, new TimeInterval(1000));

        transportState.updateState(TestUtils.subtractSeconds(2.0, TestUtils.createTransportUpdate(runtime1, 'playing', 0.0)));
        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'waiting', 2.0, { position: 2.0 }));
        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime2, 'suspended', 2.0, { position: 2.0 }));

        assert(playbackPosition.clientsWaiting == 1, `wrong count ${playbackPosition.clientsWaiting}`);
    });

    it('should drop waiting count to 0 after all clients reach wait point', async () => {
        const getPlayerState = () => TestUtils.createMediaPlayerState(track1, 'none', {position: 0.0} );
        const playbackTrack = new GroupPlaybackTrack(getPlayerState);
        const transportState = new GroupTransportState(playbackTrack, getPlayerState);
        const playbackPosition = new GroupPlaybackPosition(transportState, runtime1, new TimeInterval(1000));

        transportState.updateState(TestUtils.subtractSeconds(2.0, TestUtils.createTransportUpdate(runtime1, 'playing', 0.0)));
        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime1, 'waiting', 2.0, { position: 2.0 }));
        playbackPosition.UpdatePlaybackPosition(TestUtils.createPositionUpdate(runtime2, 'waiting', 2.0, { position: 2.0 }));

        assert(playbackPosition.clientsWaiting == 0, `wrong count ${playbackPosition.clientsWaiting}`);
    });
});