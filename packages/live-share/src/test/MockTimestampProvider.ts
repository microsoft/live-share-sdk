/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ITimestampProvider } from "../interfaces";

export class MockTimestampProvider implements ITimestampProvider {
    public called = false;

    public getTimestamp(): number {
        this.called = true;
        return new Date().getTime();
    }
}
