/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TimestampProvider } from "./TimestampProvider";
import { ILiveShareHost, INtpTimeInfo } from "./interfaces";

/**
 * Timestamp Provider that calls the Live Share Host to lookup the current time.
 */
export class HostTimestampProvider extends TimestampProvider {
    private readonly _host: ILiveShareHost;

    /**
     * Creates a new `DefaultTimestampProvider` instance.
     * @param host The current Live Share Host instance.
     */
    public constructor(host: ILiveShareHost) {
        super();
        this._host = host;
    }

    protected getNtpTime(): Promise<INtpTimeInfo> {
        return this._host.getNtpTime();
    }
}
