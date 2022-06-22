/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IMediaPlayerState } from '../EphemeralMediaSessionCoordinator';
import { ExtendedMediaSessionPlaybackState, ExtendedMediaSessionAction, ExtendedMediaMetadata } from '../MediaSessionExtensions';
import { GroupPlaybackTrack } from './GroupPlaybackTrack';
import { TypedEventEmitter } from "@fluidframework/common-utils";


/**
 * @hidden
 */
export interface ITransportState {
    playbackState: ExtendedMediaSessionPlaybackState;
    startPosition: number;
    timestamp: number;
    clientId: string;
}

/**
 * @hidden
 */
export interface ITransportStateChange {
    playbackState: ExtendedMediaSessionPlaybackState;
    startPosition: number;
    startTimestamp: number;
    didSeek: boolean;
}

/**
 * @hidden
 */
export interface IGroupTransportStateEvents {
    (event: 'transportStateChange', listener: (metadata: ExtendedMediaMetadata | null, change: ITransportStateChange) => void): any;
    (event: string, listener: (...args: any[]) => void): any;
}

/**
 * @hidden
 */
 export class GroupTransportState extends TypedEventEmitter<IGroupTransportStateEvents> {
    private readonly _getMediaPlayerState: () => IMediaPlayerState;
    private _track: GroupPlaybackTrack;
    private _current: ITransportState;

    constructor(track: GroupPlaybackTrack, getMediaPlayerState: () => IMediaPlayerState) {
        super();
        this._getMediaPlayerState = getMediaPlayerState;
        this._track = track;
        this._current = {
            playbackState: 'none',
            startPosition: 0.0,
            timestamp: 0,
            clientId: ''
        };

        // Listen for track changes
        this._track.on('trackChange', () => {
            // Track changed so reset state to stopped ad position 0.0
            this._current = {
                playbackState: 'none',
                startPosition: 0.0,
                timestamp: this._track.current.timestamp,
                clientId: this._track.current.clientId
            }
        });
    }

    public get current(): Readonly<ITransportState> {
        return this._current;
    }

    public get playbackState(): ExtendedMediaSessionPlaybackState {
        return this.current.playbackState;
    }

    public get startPosition(): number {
        return this.current.startPosition;
    }

    public get startTimestamp(): number {
        return this.current.timestamp;
    }

    public get track(): GroupPlaybackTrack {
        return this._track;
    }

    public compare(playbackState: ExtendedMediaSessionPlaybackState, startPosition: number): boolean {
        return this.current.playbackState == playbackState && this.current.startPosition == startPosition;
    }

    public updateState(state: ITransportState): boolean {
        // Ignore if same playback state and start position
        if (this.compare(state.playbackState, state.startPosition)) {
            return false;
        }

        // Ignore state changes that are older
        const originalState = this.current;
        if (state.timestamp < originalState.timestamp) {
            return false;
        }

        // Ignore state changes that have the same timestamp and the clientId sorts higher.
        if (state.timestamp == originalState.timestamp && state.clientId.localeCompare(originalState.clientId) > 0) {
            return false;
        }

        // Update playback state
        this._current = state;

        // Identify triggered action
        /*
        let action: ExtendedMediaSessionAction;
        const playerState = this._getMediaPlayerState().playbackState;
        if (originalState.playbackState == state.playbackState && playerState != 'ended') {
            action = 'seekto';
        } else if (state.playbackState == 'playing') {
            action = 'play';
        } else {
            action = 'pause';
        }
        */

        // Check for seek
        const playerState = this._getMediaPlayerState().playbackState;
        const didSeek = (originalState.playbackState == state.playbackState && playerState != 'ended');

        // Trigger transport change
        this.emit('transportStateChange', this._track.metadata, { 
            playbackState: state.playbackState, 
            startPosition: state.startPosition, 
            startTimestamp: state.timestamp,
            didSeek: didSeek 
        });
        return true;
    }
}
