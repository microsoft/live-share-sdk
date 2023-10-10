/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveEvent } from "@microsoft/live-share";
import EventEmitter from "events";
import { IMediaPlayerState } from "../LiveMediaSessionCoordinator";
import {
    CoordinationWaitPoint,
    ExtendedMediaMetadata,
    ExtendedMediaSessionActionSource,
} from "../MediaSessionExtensions";

/**
 * @hidden
 */
export interface IPlaybackTrack {
    metadata: ExtendedMediaMetadata | null;
    waitPoints: CoordinationWaitPoint[];
    timestamp: number;
    clientId: string;
}

/**
 * @hidden
 */
export enum GroupPlaybackTrackEvents {
    trackChange = "trackChange",
}

/**
 * @hidden
 */
export interface IPlaybackTrackChangeEvent extends ILiveEvent {
    metadata: ExtendedMediaMetadata | null;
}

/**
 * @hidden
 */
export class GroupPlaybackTrack extends EventEmitter {
    private readonly _getMediaPlayerState: () => IMediaPlayerState;
    private _current: IPlaybackTrack;

    constructor(getMediaPlayerState: () => IMediaPlayerState) {
        super();
        this._current = {
            metadata: null,
            waitPoints: [],
            timestamp: 0,
            clientId: "",
        };
        this._getMediaPlayerState = getMediaPlayerState;
    }

    public get current(): Readonly<IPlaybackTrack> {
        // Populate with sessions current metadata if null
        if (!this._current.metadata) {
            this._current.metadata = this._getMediaPlayerState().metadata;
        }

        return this._current;
    }

    public get metadata(): ExtendedMediaMetadata | null {
        return this.current.metadata;
    }

    public addWaitPoint(waitPoint: CoordinationWaitPoint): boolean {
        for (let i = 0; i < this._current.waitPoints.length; i++) {
            const current = this._current.waitPoints[i];
            if (current.position == waitPoint.position) {
                // Already exists
                return false;
            } else if (current.position > waitPoint.position) {
                // Insert before current position
                this._current.waitPoints.splice(i, 0, waitPoint);
                return true;
            }
        }

        // Append to list
        this._current.waitPoints.push(waitPoint);
        return true;
    }

    public findNextWaitPoint(
        lastWaitPoint: CoordinationWaitPoint | undefined
    ): CoordinationWaitPoint | undefined {
        const waitPoints = this._current.waitPoints || [];
        for (const waitPoint of waitPoints) {
            if (lastWaitPoint && waitPoint.position <= lastWaitPoint.position) {
                continue;
            }

            return waitPoint;
        }

        return undefined;
    }

    public updateTrack(
        track: IPlaybackTrack,
        source: ExtendedMediaSessionActionSource
    ): boolean {
        // Guard against missing waitPoints collection
        if (!Array.isArray(track.waitPoints)) {
            track.waitPoints = [];
        }

        // Is this the same track?
        const current = this.current;
        if (
            GroupPlaybackTrack.compareMetadata(
                this.current.metadata,
                track.metadata
            )
        ) {
            // Add any dynamic wait points.
            track.waitPoints.forEach((waitPoint) => {
                this.addWaitPoint(waitPoint);
            });

            // Ignore if same playback state
            if (
                track.timestamp == current.timestamp &&
                track.clientId == current.clientId
            ) {
                return false;
            }
        }

        // Ignore state changes that are older
        if (track.timestamp < current.timestamp) {
            return false;
        }

        // Ignore state changes that are from a clientId that sorts higher then the current one.
        // - current.clientId should not be empty if current.timestamp != 0
        if (
            track.timestamp == current.timestamp &&
            track.clientId.localeCompare(current.clientId) > 0
        ) {
            return false;
        }

        // Update current track
        this._current = track;

        // Notify listeners
        this.emit(GroupPlaybackTrackEvents.trackChange, {
            name: GroupPlaybackTrackEvents.trackChange,
            clientId: track.clientId,
            metadata: track.metadata,
            source,
        });

        return true;
    }

    public compare(metadata: ExtendedMediaMetadata | null): boolean {
        return GroupPlaybackTrack.compareMetadata(
            this.current.metadata,
            metadata
        );
    }

    public static compareMetadata(
        current: ExtendedMediaMetadata | null,
        metadata: ExtendedMediaMetadata | null
    ): boolean {
        // Only compare when we have two metadata instances
        if (current && metadata) {
            return JSON.stringify(current) == JSON.stringify(metadata);
        } else if (!current && metadata) {
            return false;
        }

        return true;
    }
}
