/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITimestampProvider } from "./interfaces";

/**
 * @hidden
 * Implements a local timestamp provider for testing purposes.
 */
export class LocalTimestampProvider implements ITimestampProvider {
    private static _warned: boolean = false;

    constructor(noWarn = false) {
        if (noWarn) {
            LocalTimestampProvider._warned = true;
        }
    }

    public getTimestamp(): number {
        if (!LocalTimestampProvider._warned) {
            console.warn(`EphemeralEvent is using a LocalTimestampProvider which could cause issues when used across multiple clients.`);
            LocalTimestampProvider._warned = true;
        }

        return new Date().getTime();
    }

    public getMaxTimestampError(): number {
        return 0;
    }
}
