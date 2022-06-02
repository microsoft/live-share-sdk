/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import 'mocha';
import { strict as assert } from 'assert';
import { CollaborationSpace, CollaborationSpaceEvents, Deferred } from '@microsoft/teams-collaboration';
import { LastMediaPositionState } from '../EphemeralMediaSessionCoordinator';
import { ExtendedMediaMetadata, ExtendedMediaSessionActionDetails } from '../MediaSessionExtensions';
import { SharedMediaSession } from '../EphemeralMediaSession';

export class TestMediaSession extends SharedMediaSession {
    private done = new Deferred<ExtendedMediaSessionActionDetails>();
    private space: CollaborationSpace;
    private playbackTimer: any;
    private playbackStarted: number = 0;
    private playbackPosition: number = 0.0;

    constructor(space: CollaborationSpace,  metadata?: ExtendedMediaMetadata|null, playbackState?: MediaSessionPlaybackState, positionState?: LastMediaPositionState) {
        super(space);
        this.space = space;
        if (metadata) { this.metadata = metadata; }
        if (playbackState) { this.playbackState = playbackState; }
        if (positionState) {
            this.playbackPosition = positionState.position != undefined ? positionState.position : 0.0;
            this.duration = positionState.duration;
            this.playbackRate = positionState.playbackRate != undefined ? positionState.playbackRate : 1;
        }

        this.setActionHandler('play', details => {
            this.play();
            this.done.resolve(details);
        });
        this.setActionHandler('pause', details => {
            this.pause();
            this.done.resolve(details);
        });
        this.setActionHandler('seekto', details => {
            this.currentTime = details.seekTime;
            this.done.resolve(details);
        });
        this.setActionHandler('settrack', details => {
            this.done.resolve(details);
        });

        this.space.addEventListener(CollaborationSpaceEvents.leftSpace, () => {
            if (this.playbackTimer) {
                clearInterval(this.playbackTimer);
                this.playbackTimer = undefined;
            }
        });
    }

    public duration?: number;
    public playbackRate: number = 1;

    public get playing(): boolean {
        return this.playbackState == 'playing';
    }

    public get paused(): boolean {
        return this.playbackState != 'playing';
    }

    public get currentTime(): number {
        if (this.playbackState == 'playing') {
            const now = this.space.clock.getTime();
            return this.playbackPosition + ((now - this.playbackStarted) / 1000);
        } else {
            return this.playbackPosition;
        }
    }

    public set currentTime(value: number) {
        const startState = this.playbackState;
        this.pause();
        this.playbackPosition = value;
        if (startState == 'playing') {
            this.play();
        } else {
            this.setPositionState({position: this.currentTime, duration: this.duration, playbackRate: this.playbackRate});
        }
    }

    public play(): void {
        if (this.playbackState != 'playing') {
            this.playbackStarted = this.space.clock.getTime();
            this.playbackState = 'playing';
            this.playbackTimer = setInterval(() => {
                this.playbackState = 'playing';
                this.setPositionState({position: this.currentTime, duration: this.duration, playbackRate: this.playbackRate});
            }, 60);
        }
    }

    public pause(): void {
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = undefined;
        }

        this.playbackPosition = this.currentTime;
        this.playbackState = 'paused';
        this.setPositionState({position: this.currentTime, duration: this.duration, playbackRate: this.playbackRate});
    }

    public async waitForAction(handler: (details: ExtendedMediaSessionActionDetails) => Promise<void>): Promise<void> {
        const details = await this.done.promise;
        this.done = new Deferred<ExtendedMediaSessionActionDetails>();
        await handler(details);
    }
}
