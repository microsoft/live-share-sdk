/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import 'mocha';
import { strict as assert } from 'assert';
import { Deferred } from './Deferred';
import { GroupPlaybackTrack } from '../internals/GroupPlaybackTrack';
import { CoordinationWaitPoint, ExtendedMediaMetadata } from '../MediaSessionExtensions';
import * as TestUtils from './TestUtils';

describe('GroupPlaybackTrack', () => {
    const track1 = { trackIdentifier: 'track1', title: 'Test Track 1' } as ExtendedMediaMetadata;
    const track2 = { trackIdentifier: 'track2', title: 'Test Track 2' } as ExtendedMediaMetadata;
    const waitPoint1 = { position: 1.0, reason: 'first' } as CoordinationWaitPoint;
    const waitPoint2 = { position: 2.0, reason: 'second' } as CoordinationWaitPoint;

    it('should compareMetadata() of two tracks', async () => {
        let matches = GroupPlaybackTrack.compareMetadata(track1, track1);
        assert(matches, `track1 didn't match track1`);

        matches = GroupPlaybackTrack.compareMetadata(track1, track2);
        assert(!matches, `track1 matched track2`);

        matches = GroupPlaybackTrack.compareMetadata(null, track1);
        assert(!matches, `matched a null current track`);

        matches = GroupPlaybackTrack.compareMetadata(track1, null);
        assert(!matches, `matched current track to a null`);

        matches = GroupPlaybackTrack.compareMetadata(null, null);
        assert(!matches, `matched two nulls`);
    });

    it('should compare() a track to current track', async () => {
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);

        let matches = playbackTrack.compare(track1);
        assert(matches, `track1 didn't match current track`);

        matches = playbackTrack.compare(track2);
        assert(!matches, `track2 matched current track`);
    });

    it('should initialize current & metadata to players current track', async () => {
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        assert(playbackTrack.current, `current is null`);
        assert(TestUtils.compareObjects(playbackTrack.current.metadata, track1), `invalid current.metadata`);
        assert(TestUtils.compareObjects(playbackTrack.metadata, track1), `invalid metadata`);
        assert(playbackTrack.current.timestamp == 0, `invalid current.timestamp`);
        assert(playbackTrack.current.clientId == '', `invalid current.clientId`);
        assert(Array.isArray(playbackTrack.current.waitPoints), `current.waitPoints not array`);
        assert(playbackTrack.current.waitPoints.length == 0, `current.waitPoints not empty`);
    });

    it('should fire "trackChange" event when no media', async () => {
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('trackChange', (metadata) => {
            try {
                assert(TestUtils.compareObjects(metadata, track1), `wrong track`);
                done.resolve();
            } catch(err) {
                done.reject(err);
            }
        });

        const updated = playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, clientId: 'a'});
        assert(updated, `updateTrack() didn't return updated`);

        await done.promise;
    });

    it('should fire "trackChange" event when switching to same track but newer timestamp', async () => {
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('trackChange', (metadata) => {
            try {
                assert(TestUtils.compareObjects(metadata, track1), `wrong track`);
                done.resolve();
            } catch(err) {
                done.reject(err);
            }
        });

        const updated = playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, clientId: 'a'});
        assert(updated, `updateTrack() didn't return updated`);

        await done.promise;
    });

    it('should switch tracks', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('trackChange', (metadata) => {
            cnt++;
            playerState.metadata = metadata;
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, clientId: 'a'});
        playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 2, clientId: 'b'});
        assert(cnt == 2, `called trackChange event ${cnt} times`);
        assert(playerState.metadata.trackIdentifier == 'track2', `wrong track set`);
    });

    it('should ignore track changes with older timestamps', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('trackChange', (metadata) => {
            cnt++;
            playerState.metadata = metadata;
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 3, clientId: 'a'});
        const updated = playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 2, clientId: 'b'});
        assert(!updated, `updateTrack() returned updated`);
        assert(cnt == 1, `called trackChange event ${cnt} times`);
    });

    it('should ignore track changes with same timestamps from different clients', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('trackChange', (metadata) => {
            cnt++;
            playerState.metadata = metadata;
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, clientId: 'a'});
        const updated = playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 1, clientId: 'b'});
        assert(!updated, `updateTrack() returned updated`);
        assert(cnt == 1, `called trackChange event ${cnt} times`);
    });

    it('should allow track changes with same timestamps from the same client', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('trackChange', (metadata) => {
            cnt++;
            playerState.metadata = metadata;
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, clientId: 'a'});
        const updated = playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 1, clientId: 'a'});
        assert(updated, `updateTrack() wasn't updated`);
        assert(cnt == 2, `called trackChange event ${cnt} times`);
    });

    it('should fire "waitPointAdded" event when a wait point is added via addWaitPoint()', async () => {
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('waitPointAdded', (metadata, waitPoint) => {
            try {
                assert(TestUtils.compareObjects(metadata, track1), `wrong track: ${JSON.stringify(metadata)}`);
                assert(TestUtils.compareObjects(waitPoint, waitPoint1), `wrong wait point`);
                done.resolve();
            } catch(err) {
                done.reject(err);
            }
        });

        const added = playbackTrack.addWaitPoint(waitPoint1);
        assert(added, `addWaitPoint() didn't return added`);

        await done.promise;
    });

    it('should fire "waitPointAdded" event when a wait point is added via updateTrack()', async () => {
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('waitPointAdded', (metadata, waitPoint) => {
            try {
                assert(TestUtils.compareObjects(metadata, track1), `wrong track: ${JSON.stringify(metadata)}`);
                assert(TestUtils.compareObjects(waitPoint, waitPoint1), `wrong wait point`);
                done.resolve();
            } catch(err) {
                done.reject(err);
            }
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [waitPoint1], timestamp: 3, clientId: 'a'});

        await done.promise;
    });

    it('should NOT fire "waitPointAdded" event if the wait point already exists', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on('waitPointAdded', (metadata, waitPoint) => cnt++);

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [waitPoint1], timestamp: 3, clientId: 'a'});
        assert(playbackTrack.current.waitPoints.length == 1, `Invalid initial wait point count`);

        const added = playbackTrack.addWaitPoint(waitPoint1);
        assert(!added, `wait point added`);
        assert(cnt == 0, `event fired`);
    });

    it('should findNextWaitPoint()', async () => {
        let playerState = TestUtils.createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [waitPoint1, waitPoint2], timestamp: 3, clientId: 'a'});

        let found = playbackTrack.findNextWaitPoint();
        assert(TestUtils.compareObjects(found, waitPoint1), `Didn't find first wait point: ${JSON.stringify(found)}`);

        found = playbackTrack.findNextWaitPoint(found);
        assert(TestUtils.compareObjects(found, waitPoint2), `Didn't find second wait point: ${JSON.stringify(found)}`);

        found = playbackTrack.findNextWaitPoint(found);
        assert(!found, `Found a third wait point: ${JSON.stringify(found)}`);
    });
});