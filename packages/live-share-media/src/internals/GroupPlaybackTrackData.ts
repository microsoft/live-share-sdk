/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    GroupPlaybackTrack,
    GroupPlaybackTrackEvents,
} from "./GroupPlaybackTrack";
import { ExtendedMediaSessionActionSource } from "../MediaSessionExtensions";
import { IGenericTypedEvents, IGroupStateEvent } from "./interfaces";
import { TypedEventEmitter } from "@fluid-internal/client-utils";

/**
 * @hidden
 */
export interface IPlaybackTrackData {
    data: object | null;
    timestamp: number;
    clientId: string;
}

/**
 * @hidden
 */
export enum PlaybackTrackDataEvents {
    dataChange = "dataChange",
}

/**
 * @hidden
 */
export interface IPlaybackTrackDataChangeEvent extends IGroupStateEvent {
    data: object | null;
}

/**
 * @hidden
 */
export class GroupPlaybackTrackData extends TypedEventEmitter<IGenericTypedEvents> {
    private _track: GroupPlaybackTrack;
    private _current: IPlaybackTrackData;

    constructor(track: GroupPlaybackTrack) {
        super();
        this._track = track;
        this._current = { data: null, timestamp: 0, clientId: "" };

        // Listen for track changes
        this._track.on(GroupPlaybackTrackEvents.trackChange, () => {
            // Track changed so reset state to empty object
            this._current = {
                data: null,
                timestamp: this._track.current.timestamp,
                clientId: this._track.current.clientId,
            };
        });
    }

    public get current(): Readonly<IPlaybackTrackData> {
        return this._current;
    }

    public get data(): object | null {
        return this.current.data;
    }

    public updateData(
        trackData: IPlaybackTrackData,
        source: ExtendedMediaSessionActionSource
    ): boolean {
        // Ignore state changes that are older
        const current = this.current;
        if (trackData.timestamp < current.timestamp) {
            return false;
        }

        // Ignore state changes that have the same timestamp and the clientId sorts higher.
        if (
            trackData.timestamp == current.timestamp &&
            trackData.clientId.localeCompare(current.clientId) > 0
        ) {
            return false;
        }

        // Ignore state changes for same data object
        if (JSON.stringify(current.data) == JSON.stringify(trackData.data)) {
            return false;
        }

        // Update current data
        this._current = trackData;

        // Notify listeners
        const event: IPlaybackTrackDataChangeEvent = {
            name: PlaybackTrackDataEvents.dataChange,
            clientId: trackData.clientId,
            data: trackData.data,
            source,
        };
        this.emit(PlaybackTrackDataEvents.dataChange, event);

        return true;
    }
}
