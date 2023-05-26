/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    IRuntimeSignaler,
    TimeInterval,
    LiveShareRuntime,
} from "@microsoft/live-share";
import { GroupTransportState } from "./GroupTransportState";
import { GroupPlaybackTrackEvents } from "./GroupPlaybackTrack";
import {
    CoordinationWaitPoint,
    ExtendedMediaSessionPlaybackState,
} from "../MediaSessionExtensions";

/**
 * Per client position
 * @hidden
 */
export interface ICurrentPlaybackPosition {
    playbackState: ExtendedMediaSessionPlaybackState;
    waitPoint?: CoordinationWaitPoint;
    position: number;
    duration?: number;
    timestamp: number;
    clientId: string;
}

/**
 * @hidden
 */
export class GroupPlaybackPosition {
    private _transportState: GroupTransportState;
    private _runtime: IRuntimeSignaler;
    private _liveRuntime: LiveShareRuntime;
    private _updateInterval: TimeInterval;
    private _positions: Map<string, ICurrentPlaybackPosition>;

    constructor(
        transportState: GroupTransportState,
        runtime: IRuntimeSignaler,
        liveRuntime: LiveShareRuntime,
        updateInterval: TimeInterval
    ) {
        this._transportState = transportState;
        this._runtime = runtime;
        this._liveRuntime = liveRuntime;
        this._updateInterval = updateInterval;
        this._positions = new Map();

        // Listen for track change
        this._transportState.track.on(
            GroupPlaybackTrackEvents.trackChange,
            (_) => {
                // Reset position tracking and duration
                this._positions = new Map();
                this.mediaDuration = undefined;
            }
        );
    }

    /**
     * Returns the latest position info for the local client.
     */
    public get localPosition(): ICurrentPlaybackPosition | undefined {
        return this._positions.get(this._runtime.clientId!);
    }

    /**
     * Returns the total number of clients actively being tracked.
     */
    public get totalClients(): number {
        let cnt = 0;
        this.forEach((_) => cnt++);
        return cnt;
    }

    /**
     * Returns true if all clients being tracked are reporting that they have
     * either ended or haven't started.
     */
    public get trackEnded(): boolean {
        let playing = 0;
        this.forEach((position, projectedPosition) => {
            switch (position.playbackState) {
                case "none":
                case "ended":
                    // not playing.
                    break;
                default:
                    playing++;
                    break;
            }
        });

        return playing == 0;
    }

    /**
     * Returns the number of clients we're waiting for before we can stop waiting.
     */
    public get clientsWaiting(): number {
        let cnt = 0;
        const waitPoint = this.localPosition?.waitPoint;
        if (
            waitPoint &&
            (waitPoint.maxClients == undefined ||
                this.totalClients <= waitPoint.maxClients)
        ) {
            this.forEach((position, projectedPosition) => {
                if (
                    position.playbackState == "suspended" &&
                    position.waitPoint
                ) {
                    cnt++;
                } else if (position.position < waitPoint.position) {
                    cnt++;
                }
            });
        }

        return cnt;
    }

    /**
     * Returns the max playback position relative to the start position.
     *
     * @remarks
     * This is called when calculating the current seekTo position.
     */
    public get maxPosition(): number {
        if (this._transportState.playbackState == "playing") {
            const now = this._liveRuntime.getTimestamp();
            const projected =
                this._transportState.startPosition +
                (now - this._transportState.timestamp) / 1000;
            return this.limitProjectedPosition(projected);
        } else {
            return this._transportState.startPosition;
        }
    }

    /**
     * Optional media duration if known.
     */
    public mediaDuration?: number;

    public get targetPosition(): number {
        if (this._transportState.playbackState == "playing") {
            return this.getMostProgressedPosition();
        } else {
            return this._transportState.startPosition;
        }
    }

    /**
     * Enumerates every reported playback position.
     * @param callbackFn Function applied to each position,
     */
    public forEach(
        callbackFn: (
            position: ICurrentPlaybackPosition,
            projectedPosition: number
        ) => void
    ): void {
        const now = this._liveRuntime.getTimestamp();
        const ignoreBefore = now - this._updateInterval.milliseconds * 2;
        const shouldProject = !this._transportState.track.metadata?.liveStream;
        this._positions.forEach((position, _) => {
            // Ignore any old updates
            if (position.timestamp > ignoreBefore) {
                // Compute projected playback position
                // - This computation does not take into account future wait points.
                const projected =
                    position.playbackState == "playing" && shouldProject
                        ? position.position + (now - position.timestamp) / 1000
                        : position.position;
                callbackFn(position, this.limitProjectedPosition(projected));
            }
        });
    }

    public UpdatePlaybackPosition(position: ICurrentPlaybackPosition): void {
        // Update duration
        if (position.duration != undefined) {
            this.mediaDuration = position.duration;
        }

        // Save last position
        if (this._positions.has(position.clientId)) {
            // Only update if newer position
            const current = this._positions.get(position.clientId)!;
            if (position.timestamp >= current.timestamp) {
                this._positions.set(position.clientId, position);
            }
        } else {
            this._positions.set(position.clientId, position);
        }
    }

    private getMostProgressedPosition(): number {
        // Compute the max possible position for the current transport state.
        // - This is needed to properly handle seeking backwards in time. Some playback heads may
        //   not have performed their seek yet and will therefore be ahead of the local player.
        const maxPosition = this.maxPosition;

        // Compute max progress
        let progress = -1;
        this.forEach((position, projectedPosition) => {
            if (
                projectedPosition <= maxPosition &&
                projectedPosition > progress
            ) {
                progress = projectedPosition;
            }
        });

        return progress;
    }

    private limitProjectedPosition(position: number): number {
        return this.mediaDuration != undefined
            ? Math.min(position, this.mediaDuration)
            : position;
    }
}
