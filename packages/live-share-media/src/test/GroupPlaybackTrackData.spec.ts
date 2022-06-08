/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import 'mocha';
import { strict as assert } from 'assert';
import { Deferred } from './Deferred';
import { GroupPlaybackTrack } from '../internals/GroupPlaybackTrack';
import { GroupPlaybackTrackData } from '../internals/GroupPlaybackTrackData';
import { ExtendedMediaMetadata } from '../MediaSessionExtensions';
import * as TestUtils from './TestUtils';

describe('GroupPlaybackTrackData', () => {
    const track1 = { trackIdentifier: 'track1', title: 'Test Track 1' } as ExtendedMediaMetadata;
    const track2 = { trackIdentifier: 'track2', title: 'Test Track 2' } as ExtendedMediaMetadata;
    const data1 = { foo: 'bar' };
    const data2 = { bar: 'foo' };

    it('should initialize current & data to null', async () => {
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const trackData = new GroupPlaybackTrackData(playbackTrack);
        assert(trackData.current, `current is null`);
        assert(!trackData.current.data, `invalid current.data`);
        assert(!trackData.data, `invalid data`);
        assert(trackData.current.timestamp == 0, `invalid current.timestamp`);
        assert(trackData.current.clientId == '', `invalid current.clientId`);
    });

    it('should fire "trackDataChange" event when initial data set', async () => {
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const trackData = new GroupPlaybackTrackData(playbackTrack);
        trackData.on('trackDataChange', (metadata, data) => {
            try {
                assert(TestUtils.compareObjects(metadata, track1), `wrong track`);
                assert(TestUtils.compareObjects(data, data1), `wrong data`);
                done.resolve();
            } catch(err) {
                done.reject(err);
            }
        });

        const updated = trackData.updateData({ data: data1, timestamp: 1, clientId: 'a'});
        assert(updated, `updateData() didn't return updated`);

        await done.promise;
    });

    it('should fire "trackDataChange" event when data changed', async () => {
        let hasData = false;
        const done = new Deferred();
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const trackData = new GroupPlaybackTrackData(playbackTrack);
        trackData.on('trackDataChange', (metadata, data) => {
            try {
                if (!hasData) {
                    assert(TestUtils.compareObjects(metadata, track1), `wrong track`);
                    assert(TestUtils.compareObjects(data, data1), `wrong initial data`);
                    hasData = true;
                } else {
                    assert(TestUtils.compareObjects(metadata, track1), `wrong track`);
                    assert(TestUtils.compareObjects(data, data2), `wrong update data`);
                    done.resolve();
                }
            } catch(err) {
                done.reject(err);
            }
        });

        trackData.updateData({ data: data1, timestamp: 1, clientId: 'a'});
        trackData.updateData({ data: data2, timestamp: 2, clientId: 'b'});

        await done.promise;
    });

    it('should ignore data changes for older timestamps', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const trackData = new GroupPlaybackTrackData(playbackTrack);
        trackData.on('trackDataChange', (metadata, data) => cnt++);

        trackData.updateData({ data: data1, timestamp: 3, clientId: 'a'});
        const updated = trackData.updateData({ data: data2, timestamp: 2, clientId: 'b'});
        assert(!updated, `updateData() returned updated`);
        assert(cnt == 1, `called trackDataChange event ${cnt} times`);
    });

    it('should reset data when track changes', async () => {
        let cnt = 0;
        let playerState = TestUtils.createMediaPlayerState(track1, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        const trackData = new GroupPlaybackTrackData(playbackTrack);
        trackData.on('trackDataChange', (data) => cnt++);

        trackData.updateData({ data: data1, timestamp: 1, clientId: 'a'});
        assert(TestUtils.compareObjects(trackData.data, data1), `wrong initial track data`);

        // Change tracks
        playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 2, clientId: 'b'});
        assert(!trackData.data, `track data didn't reset`);
        assert(cnt == 1, `trackDataChange event called too many times: ${cnt}`);
    });
});