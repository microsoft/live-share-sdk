/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

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
