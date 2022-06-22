/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import 'mocha';
import { strict as assert } from 'assert';
import { Deferred } from './Deferred';
import { GroupPlaybackTrack } from '../internals/GroupPlaybackTrack';
import { GroupTransportState } from '../internals/GroupTransportState';
import { ExtendedMediaMetadata } from '../MediaSessionExtensions';
import * as TestUtils from './TestUtils';

describe('GroupTransportState', () => {
    const track1 = { trackIdentifier: 'track1', title: 'Test Track 1' } as ExtendedMediaMetadata;
    const track2 = { trackIdentifier: 'track2', title: 'Test Track 2' } as ExtendedMediaMetadata;

    it('should initialize everything to a "none" state', async () => {
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);
        assert(transportState.current, `current is null`);
        assert(transportState.playbackState == 'none', `invalid playbackState`);
        assert(transportState.startPosition == 0.0, `invalid startPosition`);
        assert(transportState.startTimestamp == 0, `invalid startTimestamp`);
        assert(transportState.track, `invalid track`);
    });

    it('should return true for compare() with same transport state', async () => {
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);

        const matched = transportState.compare('none', 0.0);
        assert(matched, `Didn't match`);
    });

    it('should return false for compare() with a different transport state', async () => {
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);

        let matched = transportState.compare('playing', 0.0);
        assert(!matched, `playbackState matched`);

        matched = transportState.compare('none', 1.0);
        assert(!matched, `startPosition matched`);
    });

    it('should fire "transportStateChange" event when playback started', async () => {
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);
        transportState.on('transportStateChange', (metadata, change) => {
            try {
                assert(TestUtils.compareObjects(metadata, track1), `wrong track`);
                assert(change.playbackState == 'playing', `wrong action`);
                assert(change.startPosition == 0.1, `wrong start position`);
                assert(change.startTimestamp == 1, `wrong start timestamp`);
                assert(!change.didSeek, `didSeek wrong value`);
                done.resolve();
            } catch(err) {
                done.reject(err);
            }
        });

        const updated = transportState.updateState({ playbackState: 'playing', startPosition: 0.1, timestamp: 1, clientId: 'a'});
        assert(updated, `updateState() didn't return updated`);

        await done.promise;
    });

    it('should fire "transportStateChange" with didSeek when a seek occurs', async () => {
        let playing = false;
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);
        transportState.on('transportStateChange', (metadata, change) => {
            try {
                if (playing) {
                    assert(change.didSeek, `didSeek wrong value`);
                    done.resolve();
                } else {
                    playing = true;
                }
            } catch(err) {
                done.reject(err);
            }
        });

        transportState.updateState({ playbackState: 'playing', startPosition: 0.1, timestamp: 1, clientId: 'a'});
        transportState.updateState({ playbackState: 'playing', startPosition: 5.0, timestamp: 2, clientId: 'a'});

        await done.promise;
    });

    it('should change transport states', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);
        transportState.on('transportStateChange', (metadata, change) => cnt++);

        transportState.updateState({ playbackState: 'playing', startPosition: 0.1, timestamp: 1, clientId: 'a'});
        transportState.updateState({ playbackState: 'paused', startPosition: 1.1, timestamp: 2, clientId: 'a'});
        assert(cnt == 2, `called transportStateChange event ${cnt} times`);
        assert(transportState.playbackState == 'paused', `wrong playback state`);
        assert(transportState.startPosition == 1.1, `wrong startPosition`);
        assert(transportState.startTimestamp == 2, `wrong startTimestamp`);
    });

    it('should ignore changes with older timestamps', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);
        transportState.on('transportStateChange', (metadata, change) => cnt++);

        transportState.updateState({ playbackState: 'playing', startPosition: 0.1, timestamp: 2, clientId: 'a'});
        const updated = transportState.updateState({ playbackState: 'paused', startPosition: 1.1, timestamp: 1, clientId: 'a'});
        assert(!updated, `updateState() returned updated`)
        assert(cnt == 1, `called transportStateChange event ${cnt} times`);
    });

    it('should ignore changes with same timestamps but from different clients', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);
        transportState.on('transportStateChange', (metadata, change) => cnt++);

        transportState.updateState({ playbackState: 'playing', startPosition: 0.1, timestamp: 1, clientId: 'a'});
        const updated = transportState.updateState({ playbackState: 'paused', startPosition: 0.1, timestamp: 1, clientId: 'b'});
        assert(!updated, `updateState() returned updated`)
        assert(cnt == 1, `called transportStateChange event ${cnt} times`);
    });

    it('should allow changes with same timestamp and from the same client', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const transportState = new GroupTransportState(playbackTrack, () => playerState);
        transportState.on('transportStateChange', (metadata, change) => cnt++);

        transportState.updateState({ playbackState: 'playing', startPosition: 0.1, timestamp: 1, clientId: 'a'});
        const updated = transportState.updateState({ playbackState: 'paused', startPosition: 0.1, timestamp: 1, clientId: 'a'});
        assert(updated, `updateState() wasn't updated`)
        assert(cnt == 2, `called transportStateChange event ${cnt} times`);
    });
});