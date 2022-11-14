/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITimestampProvider } from "./interfaces";

/**
 * Implements a local timestamp provider for testing purposes.
 *
 * @remarks
 * This implementation does not derive from `TimestampProvider` class as it doesn't need to be started.
 */
export class LocalTimestampProvider implements ITimestampProvider {
    private static _warned: boolean = false;
    private _lastTimeSent = 0;

    constructor(noWarn = false) {
        if (noWarn) {
            LocalTimestampProvider._warned = true;
        }
    }

    public getTimestamp(): number {
        if (!LocalTimestampProvider._warned) {
            console.warn(
                `LiveEvent is using a LocalTimestampProvider which could cause issues when used across multiple clients.`
            );
            LocalTimestampProvider._warned = true;
        }

        // Return timestamp and save last
        // - We never want to generate the same timestamp twice and we always want a greater
        //   timestamp then what we previously sent.
        return (this._lastTimeSent = Math.max(
            new Date().getTime(),
            this._lastTimeSent + 1
        ));
    }

    public getMaxTimestampError(): number {
        return 0;
    }
}
