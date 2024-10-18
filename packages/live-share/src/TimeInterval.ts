/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

/**
 * @hidden
 * Manages converting time intervals from seconds-to-milliseconds and vice versa.
 */
export class TimeInterval {
    protected _milliseconds: number;

    constructor(defaultMilliseconds: number) {
        this._milliseconds = defaultMilliseconds;
    }

    public get milliseconds(): number {
        return this._milliseconds;
    }

    public set milliseconds(value: number) {
        this._milliseconds = value;
    }

    public get seconds(): number {
        return this.milliseconds / 1000;
    }

    public set seconds(value: number) {
        this.milliseconds = Math.floor(value * 1000);
    }
}
