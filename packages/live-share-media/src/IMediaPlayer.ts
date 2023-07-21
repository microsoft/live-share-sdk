/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export interface IMediaPlayer {
    readonly currentSrc: string;
    currentTime: number;
    readonly duration: number;
    // it is important that ended is reported properly. Some players like to reset at the end of playback and set ended to false
    readonly ended: boolean;
    muted: boolean;
    readonly paused: boolean;
    playbackRate: number;
    src: string;
    volume: number;
    load(): void;
    pause(): void;
    play(): Promise<void>;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
    ): void;
}
