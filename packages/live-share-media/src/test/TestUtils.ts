/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IMediaPlayer } from "../IMediaPlayer";
import { Deferred } from "@microsoft/live-share/src/internals/Deferred";
import { LiveMediaSession } from "../LiveMediaSession";
import { IRuntimeSignaler, LiveShareRuntime } from "@microsoft/live-share";

export class TestMediaPlayer implements IMediaPlayer {
    private done = new Deferred<string>();
    private playStartTime = 0;
    private _currentTime: number = 0;

    duration: number;
    ended: boolean;
    muted: boolean;
    paused: boolean = true;
    playbackRate: number;
    src: string = "test";
    currentSrc: string = this.src;
    volume: number;

    constructor() {
        setInterval(() => {
            if (!this.paused && this.playStartTime != 0) {
                this._currentTime = Date.now() / 1000 - this.playStartTime;
            }
        });
    }

    public set currentTime(value: number) {
        console.log("current time set from sync", value);
        this._currentTime = value;

        if (!this.paused) {
            this.playStartTime = Date.now() / 1000 - this.currentTime;
        }
    }

    public get currentTime(): number {
        return this._currentTime;
    }

    load(): void {
        this._currentTime = 0;
        this.paused = true;
        this.done.resolve("load");
    }
    pause(): void {
        this.paused = true;
        this._currentTime = Date.now() / 1000 - this.playStartTime;
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
