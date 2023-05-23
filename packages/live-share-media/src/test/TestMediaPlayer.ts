/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IMediaPlayer } from "../IMediaPlayer";

// TODO: duplicated from live-share internal
export class Deferred<T = void> {
    private _promise: Promise<T>;
    private _resolve?: (value: T | PromiseLike<T>) => void;
    private _reject?: (reason?: any) => void;

    constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    public get promise(): Promise<T> {
        return this._promise;
    }

    public get resolve(): (value: T | PromiseLike<T>) => void {
        return this._resolve!;
    }

    public get reject(): (reason?: any) => void {
        return this._reject!;
    }
}

export class TestMediaPlayer implements IMediaPlayer {
    private done = new Deferred<string>();
    private playStartTime = 0;
    private _currentTime: number = 0;

    currentSrc: string = "test";
    duration: number;
    ended: boolean;
    muted: boolean;
    paused: boolean = true;
    playbackRate: number;
    src: string = "test";
    volume: number;

    constructor() {
        setInterval(() => {
            if (!this.paused && this.playStartTime != 0) {
                this._currentTime = Date.now() - this.playStartTime;
            }
        });
    }

    public set currentTime(value: number) {
        console.log("current time set from sync", value);
        this._currentTime = value;

        // TODO: test seeking while not paused
        if (!this.paused) {
            this.playStartTime = Date.now() - this.currentTime;
        }
    }

    public get currentTime(): number {
        return this._currentTime;
    }

    load(): void {
        throw new Error("Method not implemented.");
    }
    pause(): void {
        this.paused = true;
        this._currentTime = Date.now() - this.playStartTime;
        this.playStartTime = 0;
        this.done.resolve("pause");
    }
    play(): Promise<void> {
        this.paused = false;
        this.playStartTime = Date.now() - this.currentTime;
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
