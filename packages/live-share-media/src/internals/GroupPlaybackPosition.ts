/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { EphemeralEvent, IRuntimeSignaler, TimeInterval } from '@microsoft/live-share';
import { GroupTransportState } from './GroupTransportState';
import { CoordinationWaitPoint, ExtendedMediaSessionPlaybackState } from '../MediaSessionExtensions';
import { ILocalNumberRange, findNumberRange } from './utils';

/**
 * Per client position snapshot
 * @hidden
 */
export interface ICurrentPlaybackPosition {
    /**
     * Clients current playback state.
     */
    playbackState: ExtendedMediaSessionPlaybackState;

    /**
     * Clients current playback position.
     */
    position: number;

    /**
     * Clients maximum timestamp error in milliseconds.
     */
    maxTimestampError: number;

    /**
     * Duration of the current media if known.
     */
    mediaDuration?: number;

    /**
     * Total number of milliseconds the client has waited since the last transport operation.
     */
    waitDuration: number;

    /**
     * Clients current wait point if in a "suspended" or "waiting" state.
     */
    waitPoint?: CoordinationWaitPoint;

    /**
     * Timestamp of when the snapshot was taken.
     */
    timestamp: number;

    /**
     * ID of the client recording the snapshot.
     */
    clientId: string;
}

/**
 * @hidden
 */
export class GroupPlaybackPosition {
    private _transportState: GroupTransportState;
    private _runtime: IRuntimeSignaler;
    private _expirationPeriod: TimeInterval;
    private _positions: Map<string, ICurrentPlaybackPosition>;

    constructor(transportState: GroupTransportState, runtime: IRuntimeSignaler, expirationPeriod: TimeInterval) {
        this._transportState = transportState;
        this._runtime = runtime;
        this._expirationPeriod = expirationPeriod;
        this._positions = new Map();

        // Listen for track change
        this._transportState.track.on('trackChange', (metadata) => {
            // Reset position tracking and duration
            this._positions = new Map();
            this.mediaDuration = -1;
        });
    }

    /**
     * Optional media duration if known.
     */
     public mediaDuration: number = -1;

    /**
     * Returns the number of clients we're waiting for before we can resume playback.
     */
    public get clientsWaiting(): number {
        let cnt = 0;
        const waitPoint = this.localPosition?.waitPoint;
        if (waitPoint && (waitPoint.maxClients == undefined || this.totalClients <= waitPoint.maxClients)) {
            this.forEach((position) => {
                if (position.playbackState == 'suspended' && position.waitPoint) {
                    cnt++;
                } else if (position.position < waitPoint.position) {
                    cnt++;
                }
            });
        }

        return cnt;
    }

    /**
     * Returns the latest position info for the local client.
     */
    public get localPosition(): ICurrentPlaybackPosition|undefined {
        return this._positions.get(this._runtime.clientId!);
    }

    /**
     * Minimum amount of time that any client has spent in a waiting state since the last transport 
     * operation. 
     * 
     * @remarks
     * This is used to adjust the projected `targetPosition` when wait points are encountered during
     * playback. Clients with a `waitDuration` of 0 are ignored as they could be late joiners.
     * @returns Duration in milliseconds.
     */
    public get minWaitDuration(): number {
        let duration = 0;
        this.forEach((position) => {
            if (position.waitDuration > 0 && (position.waitDuration < duration || duration == 0)) {
                duration = position.waitDuration;
            }
        });

        return duration;
    }

    /**
     * Returns the ideal playback position relative to the start position of the current transport state.
     * 
     * @remarks
     * The `targetPosition` is the ideal position where the playback should be assuming no buffering 
     * has occurred. It's computed by simply subtracting the timestamp of when playback started from
     * the current timestamp and adding that to the position where playback started. This value will 
     * be the same across all clients at any given point in time with a maximum deviation equal to 
     * the `maxTimestampError` of all the clients.
     * 
     * Buffering can cause individual clients to lag the `targetPosition` and the exact amount of lag 
     * for the local client and the group can be measured using `computePlaybackLag()`.
     * 
     * Wait points can add complexity to the computation of `targetPosition` as clients wait 
     * individually and will likely resume playback at slightly different times. All clients are
     * expected to track the exact amount of time they've spent waiting since playback began. The
     * client that has waited the least will be considered the leader and their wait time will be 
     * used to adjust the final target position. 
     */
    public get targetPosition(): number {
        if (this._transportState.playbackState == 'playing') {
            // How much progress has the media ideally made since playback was started?
            const now = EphemeralEvent.getTimestamp();
            const progress = Math.max((now - this._transportState.startTimestamp) / 1000, 0.0);

            // Adjust for any time clients have spent waiting on wait points
            // - minWaitDuration should never be greater then progress but just in case we 
            //   wait to avoid ever compting a position that's before the startPosition.
            const adjustments = Math.min(this.minWaitDuration, progress);

            // The target position is simply the start position plus the adjusted progress.
            const target = this._transportState.startPosition + (progress - adjustments);

            // Ensure that the target position isn't past the end of the media
            return this.mediaDuration > 0 ? Math.min(target, this.mediaDuration) : target;
        } else {
            // Return stationary position
            return this._transportState.startPosition;
        }
    }

    /**
     * Returns the total number of clients actively being tracked.
     */
    public get totalClients(): number {
        let cnt = 0;
        this.forEach(_ => cnt++);
        return cnt;
    }

    /**
     * Returns true if all clients being tracked are reporting that they have
     * either ended or haven't started.
     */
    public get trackEnded(): boolean {
        let playing = 0;
        this.forEach((position) => {
            switch (position.playbackState) {
                case 'none':
                case 'ended':
                    // not playing.
                    break;
                default:
                    playing++;
                    break;
            }
        });

        return playing == 0;
    }

    public computePlaybackLag(): ILocalNumberRange {
        const now = EphemeralEvent.getTimestamp();
        const targetPosition = this.targetPosition;

        // Compute the lag of every client
        let local = -1;
        const values: number[] = [];
        this.forEach((position) => {
            // Project current position
            let current = position.position;
            if (position.playbackState == 'playing') {
                // Compute projected progress and convert to seconds
                const progress = (now - position.timestamp) / 1000;
                current += progress;
            }

            // Compute projected lag and add to list
            const lag = targetPosition >= current ? targetPosition - current : 0.0;
            values.push(lag);
            
            // Check for local client
            if (position.clientId == this._runtime.clientId) {
                local = lag;
            }
        });

        // Find the range of lag values
        const range = findNumberRange(values);

        // Return computed results
        return { local, ...range };
    }

    /**
     * Enumerates every reported playback position.
     * @param callbackFn Function applied to each position,
     */
    public forEach(callbackFn: (position: ICurrentPlaybackPosition) => void): void {
        const now = EphemeralEvent.getTimestamp();
        const ignoreBefore = now - this._expirationPeriod.milliseconds;
        this._positions.forEach((position) => {
            // Ignore any old updates
            if (position.timestamp > ignoreBefore) {
                callbackFn(position);
            }
        });
    }

    /**
     * Updates the tracking information for a client.
     * @param position Latest position information
     */
    public updatePlaybackPosition(position: ICurrentPlaybackPosition): void {
        // Update duration
        // - Duration should be the same for all clients but if not we'll store the longest duration
        if (typeof position.mediaDuration == 'number' && position.mediaDuration > this.mediaDuration) {
            this.mediaDuration = position.mediaDuration;
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
}
