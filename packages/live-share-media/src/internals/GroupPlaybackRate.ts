/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TypedEventEmitter } from "@fluid-internal/client-utils";
import { ExtendedMediaSessionActionSource } from "../MediaSessionExtensions";
import { IGroupStateEvent, IGenericTypedEvents } from "./interfaces";

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
export interface IPlaybackRateChangeEvent extends IGroupStateEvent {
    playbackRate: number;
}

/**
 * @hidden
 */
export class GroupPlaybackRate extends TypedEventEmitter<IGenericTypedEvents> {
    private _current: IPlaybackRate;

    constructor() {
        super();
        this._current = { playbackRate: 1.0, timestamp: 0, clientId: "" };
    }

    public get current(): Readonly<IPlaybackRate> {
        return this._current;
    }

    public get rate(): number {
        return this.current.playbackRate;
    }

    public updatePlaybackRate(
        newRate: IPlaybackRate,
        source: ExtendedMediaSessionActionSource
    ): boolean {
        // Ignore state changes that are older
        const current = this.current;
        if (newRate.timestamp < current.timestamp) {
            return false;
        }

        // Ignore state changes that have the same timestamp and the clientId sorts higher.
        if (
            newRate.timestamp == current.timestamp &&
            newRate.clientId.localeCompare(current.clientId) > 0
        ) {
            return false;
        }

        // Ignore state changes for same data object
        if (current.playbackRate == newRate.playbackRate) {
            return false;
        }

        // Update current data
        this._current = newRate;

        const event: IPlaybackRateChangeEvent = {
            name: PlaybackRateEvents.rateChange,
            clientId: newRate.clientId,
            playbackRate: newRate.playbackRate,
            source,
        };

        // Notify listeners
        this.emit(PlaybackRateEvents.rateChange, event);

        return true;
    }
}
