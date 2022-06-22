/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { MockRuntimeSignaler } from './MockRuntimeSignaler';
import { ITransportState, ICurrentPlaybackPosition } from '../internals';
import { CoordinationWaitPoint, ExtendedMediaMetadata, ExtendedMediaSessionPlaybackState } from '../MediaSessionExtensions';
import { IMediaPlayerState } from '../EphemeralMediaSessionCoordinator';

export function createConnectedRuntimes() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return {localRuntime, remoteRuntime};
}


export function createTransportUpdate(runtime: MockRuntimeSignaler, playbackState: ExtendedMediaSessionPlaybackState, startPosition: number): ITransportState {
    return {
        playbackState: playbackState,
        startPosition: startPosition,
        timestamp: new Date().getTime(),
        clientId: runtime.clientId
    };
}

export function createPositionUpdate(runtime: MockRuntimeSignaler, playbackState: ExtendedMediaSessionPlaybackState, position: number, waitPoint?: CoordinationWaitPoint, mediaDuration?: number, waitDuration?: number): ICurrentPlaybackPosition {
    return {
        playbackState: playbackState,
        waitPoint: waitPoint,
        position: position,
        mediaDuration: mediaDuration,
        timestamp: new Date().getTime(),
        maxTimestampError: 30,
        waitDuration: waitDuration ?? 0,
        clientId: runtime.clientId
    };
}

export function createMediaPlayerState(metadata: ExtendedMediaMetadata|null, playbackState: ExtendedMediaSessionPlaybackState, positionState?: MediaPositionState, trackData: object = null): IMediaPlayerState {
    return { metadata, trackData, playbackState, positionState };
}

export function subtractSeconds<T extends { timestamp: number; }>(seconds: number, update: T): T {
    update.timestamp -= (seconds * 1000);
    return update;
} 

export function addSeconds<T extends { timestamp: number; }>(seconds: number, update: T): T {
    update.timestamp += (seconds * 1000);
    return update;
} 

export function compareObjects<T>(v1?: T, v2?: T): boolean {
    if (v1 && v2) {
        return JSON.stringify(v1) == JSON.stringify(v2);
    } else if (v1 || v2) {
        return false;
    } else {
        return true;
    }
}