/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import 'mocha';
import { strict as assert } from 'assert';
import { IParticipant, ParticipantRole, SimulatedBroadcastHub, SimulatedCollaborationSpace } from '@microsoft/teams-collaboration';
import { GroupPlaybackTrack } from './GroupPlaybackTrack';
import { GroupTransportState, ITransportState } from './GroupTransportState';
import { GroupPlaybackPosition, ICurrentPlaybackPosition } from './GroupPlaybackPosition';
import { CoordinationWaitPoint, ExtendedMediaMetadata, ExtendedMediaSessionPlaybackState } from '../MediaSessionExtensions';
import { TimeInterval } from '../internals';

function createTransportUpdate(space: SimulatedCollaborationSpace, playbackState: ExtendedMediaSessionPlaybackState, startPosition: number): ITransportState {
    return {
        playbackState: playbackState,
        startPosition: startPosition,
        timestamp: space.clock.getTime(),
        socketId: space.socket.id
    };
}

function createPositionUpdate(space: SimulatedCollaborationSpace, playbackState: ExtendedMediaSessionPlaybackState, position: number, waitPoint?: CoordinationWaitPoint, duration?: number): ICurrentPlaybackPosition {
    return {
        playbackState: playbackState,
        waitPoint: waitPoint,
        position: position,
        duration: duration,
        timestamp: space.clock.getTime(),
        socketId: space.socket.id
    };
}

function subtractSeconds<T extends { timestamp: number; }>(seconds: number, update: T): T {
    update.timestamp -= (seconds * 1000);
    return update;
} 

function addSeconds<T extends { timestamp: number; }>(seconds: number, update: T): T {
    update.timestamp += (seconds * 1000);
    return update;
} 

describe('GroupPlaybackPosition', () => {
    const hub = new SimulatedBroadcastHub();

    const user1: IParticipant = { participantId: 'user1', role: ParticipantRole.organizer };
    const space1 = new SimulatedCollaborationSpace(user1, hub);
    const user2: IParticipant = { participantId: 'user2', role: ParticipantRole.participant };
    const space2 = new SimulatedCollaborationSpace(user2, hub);

    const track1 = { trackIdentifier: 'track1', title: 'Test Track 1' } as ExtendedMediaMetadata;
    const track2 = { trackIdentifier: 'track2', title: 'Test Track 2' } as ExtendedMediaMetadata;

    const updateInterval = new TimeInterval(10);

    it('should start with 0 clients', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, updateInterval);

        await space1.join();
        try {
            assert(playbackPosition.totalClients == 0, `wrong client count`);
            assert(playbackPosition.localPosition == undefined, `wrong position`);
        } finally {
            await space1.leave();
        }
    });

    it('should find local position', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, updateInterval);

        await space1.join();
        try {
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'none', 0.0));

            assert(playbackPosition.totalClients == 1, `wrong client count`);
            assert(playbackPosition.localPosition != undefined, `local position not found`);
        } finally {
            await space1.leave();
        }
    });

    it('should update local position', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, updateInterval);

        await space1.join();
        try {
            const position = createPositionUpdate(space1, 'none', 0.0);
            await playbackPosition.UpdatePlaybackPosition(position);

            const newPosition = addSeconds(1.0, createPositionUpdate(space1, 'none', 0.0));
            await playbackPosition.UpdatePlaybackPosition(newPosition);

            assert(playbackPosition.totalClients == 1, `wrong client count`);
            assert(playbackPosition.localPosition != undefined, `local position not found`);
            assert(playbackPosition.localPosition.timestamp == newPosition.timestamp, `position not updated`);
        } finally {
            await space1.leave();
        }
    });

    it('should ignore older position updates', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, updateInterval);

        await space1.join();
        try {
            const position = createPositionUpdate(space1, 'none', 0.0);
            await playbackPosition.UpdatePlaybackPosition(position);

            const newPosition = subtractSeconds(1.0, createPositionUpdate(space1, 'none', 0.0));
            await playbackPosition.UpdatePlaybackPosition(newPosition);

            assert(playbackPosition.totalClients == 1, `wrong client count`);
            assert(playbackPosition.localPosition != undefined, `local position not found`);
            assert(playbackPosition.localPosition.timestamp == position.timestamp, `position not updated`);
        } finally {
            await space1.leave();
        }
    });

    it('should track other client positions', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, updateInterval);

        await space1.join();
        await space2.join();
        try {
            const position1 = createPositionUpdate(space1, 'none', 0.0);
            await playbackPosition.UpdatePlaybackPosition(position1);

            const position2 = addSeconds(1.0, createPositionUpdate(space2, 'none', 0.0));
            await playbackPosition.UpdatePlaybackPosition(position2);

            assert(playbackPosition.totalClients == 2, `wrong client count`);
            assert(playbackPosition.localPosition != undefined, `local position not found`);
            assert(playbackPosition.localPosition.timestamp == position1.timestamp, `position not updated`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should enumerate client positions', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, updateInterval);

        await space1.join();
        await space2.join();
        try {
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'none', 0.0));
            await playbackPosition.UpdatePlaybackPosition(subtractSeconds(updateInterval.seconds, createPositionUpdate(space2, 'none', 0.0)));

            let cnt = 0;
            playbackPosition.forEach((position, projectedPosition) => {
                assert(position.position == 0.0, `wrong position ${position.position}`);
                assert(projectedPosition == 0.0, `wrong projected position ${projectedPosition}`);
                cnt++;
            });

            assert(cnt == 2, `only enumerated ${cnt} positions`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should ignore stale positions', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, updateInterval);

        await space1.join();
        await space2.join();
        try {
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'none', 0.0));
            await playbackPosition.UpdatePlaybackPosition(subtractSeconds(updateInterval.seconds * 3, createPositionUpdate(space2, 'none', 0.0)));

            let cnt = 0;
            playbackPosition.forEach((position, projectedPosition) => {
                assert(position.position == 0.0, `wrong position ${position.position}`);
                assert(projectedPosition == 0.0, `wrong projected position ${projectedPosition}`);
                cnt++;
            });

            assert(cnt == 1, `enumerated ${cnt} positions`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should project position when playing', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, new TimeInterval(1000));

        await space1.join();
        try {
            await playbackPosition.UpdatePlaybackPosition(subtractSeconds(1.0, createPositionUpdate(space1, 'playing', 0.0)));

            let cnt = 0;
            playbackPosition.forEach((position, projectedPosition) => {
                assert(position.position == 0.0, `wrong position ${position.position}`);
                assert(projectedPosition >= 1.0, `wrong projected position ${projectedPosition}`);
                cnt++;
            });

            assert(cnt == 1, `enumerated ${cnt} positions`);
        } finally {
            await space1.leave();
        }
    });

    it('should compute max playback position relative to transport state', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, new TimeInterval(1000));

        await space1.join();
        try {
            assert(playbackPosition.maxPosition == 0.0, `wrong starting position of ${playbackPosition.maxPosition}`);

            await transportState.updateState(subtractSeconds(2.0, createTransportUpdate(space1, 'playing', 0.0)));

            assert(playbackPosition.maxPosition >= 2.0, `wrong projected position of ${playbackPosition.maxPosition}`);
        } finally {
            await space1.leave();
        }
    });

    it('should compute target position relative to other client positions', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, new TimeInterval(1000));

        await space1.join();
        await space2.join();
        try {
            assert(playbackPosition.targetPosition == 0.0, `wrong starting position of ${playbackPosition.targetPosition}`);

            await transportState.updateState(subtractSeconds(2.0, createTransportUpdate(space1, 'playing', 0.0)));
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'playing', 0.0));
            await playbackPosition.UpdatePlaybackPosition(subtractSeconds(1.0, createPositionUpdate(space2, 'playing', 0.0)));

            // We're sometimes getting back a target position of 0.999 instead of 1.0 (some sort of rounding error)
            assert(playbackPosition.targetPosition > 0.9 && playbackPosition.targetPosition < 2.0, `wrong target position of ${playbackPosition.targetPosition}`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should limit max and target position by media duration', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, new TimeInterval(1000));

        await space1.join();
        await space2.join();
        try {
            await transportState.updateState(subtractSeconds(2.0, createTransportUpdate(space1, 'playing', 0.0)));
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'playing', 0.0, undefined, 0.5));
            await playbackPosition.UpdatePlaybackPosition(subtractSeconds(1.0, createPositionUpdate(space2, 'playing', 0.0, undefined, 0.5)));

            assert(playbackPosition.maxPosition == 0.5, `wrong max position ${playbackPosition.maxPosition}`);
            assert(playbackPosition.targetPosition == 0.5, `wrong target position ${playbackPosition.targetPosition}`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should count number of waiting clients', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, new TimeInterval(1000));

        await space1.join();
        await space2.join();
        try {
            await transportState.updateState(subtractSeconds(2.0, createTransportUpdate(space1, 'playing', 0.0)));
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'suspended', 2.0, { position: 2.0 }));
            await playbackPosition.UpdatePlaybackPosition(subtractSeconds(1.0, createPositionUpdate(space2, 'playing', 0.0, undefined)));

            assert(playbackPosition.clientsWaiting == 2, `wrong count ${playbackPosition.clientsWaiting}`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should drop waiting count after suspension ends', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, new TimeInterval(1000));

        await space1.join();
        await space2.join();
        try {
            await transportState.updateState(subtractSeconds(2.0, createTransportUpdate(space1, 'playing', 0.0)));
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'waiting', 2.0, { position: 2.0 }));
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space2, 'suspended', 2.0, { position: 2.0 }));

            assert(playbackPosition.clientsWaiting == 1, `wrong count ${playbackPosition.clientsWaiting}`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });

    it('should drop waiting count to 0 after all clients reach wait point', async () => {
        const playbackTrack = new GroupPlaybackTrack(() => track1);
        const transportState = new GroupTransportState(playbackTrack);
        const playbackPosition = new GroupPlaybackPosition(transportState, space1, new TimeInterval(1000));

        await space1.join();
        await space2.join();
        try {
            await transportState.updateState(subtractSeconds(2.0, createTransportUpdate(space1, 'playing', 0.0)));
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space1, 'waiting', 2.0, { position: 2.0 }));
            await playbackPosition.UpdatePlaybackPosition(createPositionUpdate(space2, 'waiting', 2.0, { position: 2.0 }));

            assert(playbackPosition.clientsWaiting == 0, `wrong count ${playbackPosition.clientsWaiting}`);
        } finally {
            await space1.leave();
            await space2.leave();
        }
    });
});