/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import 'mocha';
import { strict as assert } from 'assert';
import { Deferred } from './Deferred';
import { GroupPlaybackTrack, GroupPlaybackTrackEvents, IPlaybackTrackChangeEvent } from '../internals/GroupPlaybackTrack';
import { ExtendedMediaMetadata, ExtendedMediaSessionPlaybackState } from '../MediaSessionExtensions';
import { IMediaPlayerState } from '../EphemeralMediaSessionCoordinator';

function createMediaPlayerState(metadata: ExtendedMediaMetadata|null, playbackState: ExtendedMediaSessionPlaybackState, positionState?: MediaPositionState, trackData: object = null): IMediaPlayerState {
    return { metadata, trackData, playbackState, positionState };
}

describe('GroupPlaybackTrack', () => {
    const track1 = { trackIdentifier: 'track1', title: 'Test Track 1' } as ExtendedMediaMetadata;
    const track2 = { trackIdentifier: 'track2', title: 'Test Track 2' } as ExtendedMediaMetadata;

    it('should fire "trackChange" event when no media', async () => {
        const done = new Deferred();
        let playerState = createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on(GroupPlaybackTrackEvents.trackChange, (event: IPlaybackTrackChangeEvent) => {
            try {
                assert(event.metadata, `no metadata`);
                assert(event.metadata.trackIdentifier == 'track1', `wrong track`);
                done.resolve();
            } catch(err) {
                done.reject(err);
            }
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, clientId: 'a'});

        await done.promise;
    });

    it('should switch tracks', async () => {
        let cnt = 0;
        let playerState = createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on(GroupPlaybackTrackEvents.trackChange, (event: IPlaybackTrackChangeEvent) => {
            cnt++;
            playerState.metadata = event.metadata;
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 1, clientId: 'a'});
        playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 2, clientId: 'b'});
        assert(cnt == 2, `called trackChange event ${cnt} times`);
        assert(playerState.metadata.trackIdentifier == 'track2', `wrong track set`);
    });

    it('should ignore track changes with older timestamps', async () => {
        let cnt = 0;
        let playerState = createMediaPlayerState(null, 'none');
        const playbackTrack = new GroupPlaybackTrack(() => playerState);
        playbackTrack.on(GroupPlaybackTrackEvents.trackChange, (event: IPlaybackTrackChangeEvent) => {
            cnt++;
            playerState.metadata = event.metadata;
        });

        playbackTrack.updateTrack({ metadata: track1, waitPoints: [], timestamp: 3, clientId: 'a'});
        playbackTrack.updateTrack({ metadata: track2, waitPoints: [], timestamp: 2, clientId: 'b'});
        assert(cnt == 1, `called trackChange event ${cnt} times`);
    });
});