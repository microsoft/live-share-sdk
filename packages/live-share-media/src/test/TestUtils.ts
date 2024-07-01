/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IMediaPlayer } from "../IMediaPlayer";
import { LiveMediaSession } from "../LiveMediaSession";
import { ITimestampProvider } from "@microsoft/live-share";
import {
    Deferred,
    IRuntimeSignaler,
    LiveShareRuntime,
} from "@microsoft/live-share/internal";

export class TestMediaPlayer implements IMediaPlayer {
    private done = new Deferred<string>();
    private playStartTime = 0;
    private _currentTime: number = 0;
    private _playbackRate: number = 1;

    duration: number;
    ended: boolean;
    muted: boolean;
    paused: boolean = true;
    src: string = "test";
    currentSrc: string;
    volume: number;

    constructor(public onCurrentTimeSet?: (number) => void) {
        setInterval(() => {
            if (!this.paused && this.playStartTime != 0) {
                this._currentTime =
                    (Date.now() / 1000 - this.playStartTime) *
                    this.playbackRate;
            }
        });
    }

    public set currentTime(value: number) {
        console.log("current time set from sync", value);
        this._currentTime = value;

        if (!this.paused) {
            this.playStartTime = Date.now() / 1000 - this.currentTime;
        }
        this.onCurrentTimeSet?.(this._currentTime);
    }

    public get currentTime(): number {
        return this._currentTime;
    }

    public set playbackRate(value: number) {
        this._playbackRate = value;
        this.done.resolve("ratechange");
    }

    public get playbackRate(): number {
        return this._playbackRate;
    }

    load(): void {
        this._currentTime = 0;
        this.paused = true;
        this.done.resolve("load");
    }
    pause(): void {
        this.paused = true;
        this._currentTime =
            (Date.now() / 1000 - this.playStartTime) * this.playbackRate;
        this.playStartTime = 0;
        this.done.resolve("pause");
    }
    play(): Promise<void> {
        this.paused = false;
        this.playStartTime = Date.now() / 1000 - this.currentTime;
        this.done.resolve("play");
        return Promise.resolve();
    }
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions | undefined
    ): void {}
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions | undefined
    ): void {
        throw new Error("Method not implemented.");
    }

    public async waitForAction(): Promise<string> {
        const action = await this.done.promise;
        this.done = new Deferred<string>();
        return action;
    }
}

export class TestLiveMediaSession extends LiveMediaSession {
    public async clientId(): Promise<string> {
        return await this.waitUntilConnected();
    }

    public runtimeForTesting(): IRuntimeSignaler {
        return this.runtime;
    }

    public liveRuntimeForTesting(): LiveShareRuntime {
        return this.liveRuntime;
    }
}

// not using default local timestamp provider, need to be able to get timestamp of same millisecond for some tests
export class TestMediaTimeStampProvider implements ITimestampProvider {
    constructor() {}
    getTimestamp(): number {
        return new Date().getTime();
    }
    getMaxTimestampError(): number {
        return 0;
    }
}
