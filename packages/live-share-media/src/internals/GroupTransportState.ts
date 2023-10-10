/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveEvent, LiveShareRuntime } from "@microsoft/live-share";
import EventEmitter from "events";
import { IMediaPlayerState } from "../LiveMediaSessionCoordinator";
import {
    ExtendedMediaSessionPlaybackState,
    ExtendedMediaSessionAction,
    ExtendedMediaSessionActionSource,
} from "../MediaSessionExtensions";
import {
    GroupPlaybackTrack,
    GroupPlaybackTrackEvents,
} from "./GroupPlaybackTrack";

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
export enum GroupTransportStateEvents {
    transportStateChange = "transportStateChange",
}

/**
 * @hidden
 */
export interface ITransportStateChangeEvent extends ILiveEvent {
    action: ExtendedMediaSessionAction;
    seekTime?: number;
}

/**
 * @hidden
 */
export class GroupTransportState extends EventEmitter {
    private readonly _getMediaPlayerState: () => IMediaPlayerState;
    private _track: GroupPlaybackTrack;
    private readonly _liveRuntime: LiveShareRuntime;
    private _current: ITransportState;

    constructor(
        track: GroupPlaybackTrack,
        getMediaPlayerState: () => IMediaPlayerState,
        liveRuntime: LiveShareRuntime
    ) {
        super();
        this._liveRuntime = liveRuntime;
        this._getMediaPlayerState = getMediaPlayerState;
        this._track = track;
        this._current = {
            playbackState: "none",
            startPosition: 0.0,
            timestamp: 0,
            clientId: "",
        };

        // Listen for track changes
        this._track.on(GroupPlaybackTrackEvents.trackChange, () => {
            // Track changed so reset state to stopped ad position 0.0
            this._current = {
                playbackState: "none",
                startPosition: 0.0,
                timestamp: this._track.current.timestamp,
                clientId: this._track.current.clientId,
            };
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

    public get timestamp(): number {
        return this.current.timestamp;
    }

    public get track(): GroupPlaybackTrack {
        return this._track;
    }

    public compare(state: ITransportState): boolean {
        return (
            this.current.playbackState == state.playbackState &&
            this.current.startPosition == state.startPosition
        );
    }

    public updateState(
        state: ITransportState,
        source: ExtendedMediaSessionActionSource
    ): boolean {
        // Ignore if same playback state and start position
        if (this.compare(state)) {
            return false;
        }

        // Ignore state changes that are older
        const originalState = this.current;
        if (state.timestamp < originalState.timestamp) {
            return false;
        }

        // Ignore state changes that have the same timestamp and the clientId sorts higher.
        if (
            state.timestamp == originalState.timestamp &&
            state.clientId.localeCompare(originalState.clientId) > 0
        ) {
            return false;
        }

        // Update playback state
        this._current = state;

        // Trigger transport change
        const playerState = this._getMediaPlayerState().playbackState;
        if (
            originalState.playbackState == state.playbackState &&
            playerState != "ended"
        ) {
            this.emit(GroupTransportStateEvents.transportStateChange, {
                type: GroupTransportStateEvents.transportStateChange,
                action: "seekto",
                clientId: state.clientId,
                seekTime: state.startPosition,
                source,
            });
        } else if (state.playbackState == "playing") {
            const now = this._liveRuntime.getTimestamp();
            const projectedPosition =
                state.startPosition + (now - state.timestamp) / 1000;
            this.emit(GroupTransportStateEvents.transportStateChange, {
                type: GroupTransportStateEvents.transportStateChange,
                action: "play",
                clientId: state.clientId,
                seekTime: projectedPosition,
                source,
            });
        } else {
            this.emit(GroupTransportStateEvents.transportStateChange, {
                type: GroupTransportStateEvents.transportStateChange,
                action: "pause",
                clientId: state.clientId,
                seekTime: state.startPosition,
                source,
            });
        }

        return true;
    }
}
