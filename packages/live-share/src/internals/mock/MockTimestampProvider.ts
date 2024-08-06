/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITimestampProvider } from "../../interfaces.js";

export class MockTimestampProvider implements ITimestampProvider {
    public called = false;

    public getTimestamp(): number {
        this.called = true;
        return new Date().getTime();
    }

    public getMaxTimestampError(): number {
        this.called = true;
        return 0;
    }
}
