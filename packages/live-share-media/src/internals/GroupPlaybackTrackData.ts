/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveEvent } from "@microsoft/live-share";
import EventEmitter from "events";
import {
    GroupPlaybackTrack,
    GroupPlaybackTrackEvents,
} from "./GroupPlaybackTrack";
import { ExtendedMediaSessionActionSource } from "../MediaSessionExtensions";

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
export interface IPlaybackTrackDataChangeEvent extends ILiveEvent {
    data: object | null;
}

/**
 * @hidden
 */
export class GroupPlaybackTrackData extends EventEmitter {
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
        event: IPlaybackTrackData,
        source: ExtendedMediaSessionActionSource
    ): boolean {
        // Ignore state changes that are older
        const current = this.current;
        if (event.timestamp < current.timestamp) {
            return false;
        }

        // Ignore state changes that have the same timestamp and the clientId sorts higher.
        if (
            event.timestamp == current.timestamp &&
            event.clientId.localeCompare(current.clientId) > 0
        ) {
            return false;
        }

        // Ignore state changes for same data object
        if (JSON.stringify(current.data) == JSON.stringify(event.data)) {
            return false;
        }

        // Update current data
        this._current = event;

        // Notify listeners
        this.emit(PlaybackTrackDataEvents.dataChange, {
            type: PlaybackTrackDataEvents.dataChange,
            clientId: event.clientId,
            data: event.data,
            source,
        });

        return true;
    }
}
