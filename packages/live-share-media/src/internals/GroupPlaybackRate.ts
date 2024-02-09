/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveEvent } from "@microsoft/live-share";
import EventEmitter from "events";
import { ExtendedMediaSessionActionSource } from "../MediaSessionExtensions";

/**
 * @hidden
 */
export interface IPlaybackRate {
    playbackRate: number;
    timestamp: number;
    clientId: string;
}

/**
 * @hidden
 */
export enum PlaybackRateEvents {
    rateChange = "rateChange",
}

/**
 * @hidden
 */
export interface IPlaybackRateChangeEvent extends ILiveEvent {
    playbackRate: number;
}

/**
 * @hidden
 */
export class GroupPlaybackRate extends EventEmitter {
    private _current: IPlaybackRate;

    constructor() {
        super();

        this._current = { playbackRate: 1.0, timestamp: 0, clientId: "" };

        // TODO: Listen for track changes, reset to 1.0?
        // this._track.on(GroupPlaybackTrackEvents.trackChange, () => {
        //     // Track changed so reset state to empty object
        //     this._current = {
        //         data: null,
        //         timestamp: this._track.current.timestamp,
        //         clientId: this._track.current.clientId,
        //     };
        // });
    }

    public get current(): Readonly<IPlaybackRate> {
        return this._current;
    }

    public get playbackRate(): number {
        return this.current.playbackRate;
    }

    public updatePlaybackRate(
        event: IPlaybackRate,
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
        if (current.playbackRate == event.playbackRate) {
            return false;
        }

        // Update current data
        this._current = event;

        // Notify listeners
        this.emit(PlaybackRateEvents.rateChange, {
            type: PlaybackRateEvents.rateChange,
            clientId: event.clientId,
            playbackRate: event.playbackRate,
            source,
        });

        return true;
    }
}
