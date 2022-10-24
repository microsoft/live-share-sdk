/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

/**
 * @hidden
 * Manages converting time intervals from seconds-to-milliseconds and vice versa.
 */
export class TimeInterval {
    private _value: number;

    constructor(defaultMilliseconds: number) {
        this._value = defaultMilliseconds;
    }

    public get milliseconds(): number {
        return this._value;
    }

    public set milliseconds(value: number) {
        this._value = value;
    }

    public get seconds(): number {
        return this._value / 1000;
    }

    public set seconds(value: number) {
        this._value = Math.floor(value * 1000);
    }
}
