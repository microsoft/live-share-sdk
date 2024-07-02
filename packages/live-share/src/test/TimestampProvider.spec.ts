/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { INtpTimeInfo } from "../interfaces";
import { TimestampProvider } from "../TimestampProvider";
import { Deferred } from "../internals/Deferred";

class TestTimestampProvider extends TimestampProvider {
    private _onGetNtpTime: () => Promise<void>;
    public time = new Date();

    public constructor(onGetNtpTime?: () => Promise<void>) {
        super();

        function defaultHandler() {
            return Promise.resolve();
        }

        this._onGetNtpTime = onGetNtpTime ?? defaultHandler;
    }

    protected async getNtpTime(): Promise<INtpTimeInfo> {
        await this._onGetNtpTime();
        return {
            ntpTime: this.time.toISOString(),
            ntpTimeInUTC: this.time.getTime(),
        };
    }
}

describe("TimestampProvider", () => {
    it("Should start", async () => {
        const done = new Deferred();
        const provider = new TestTimestampProvider(() => {
            done.resolve();
            return Promise.resolve();
        });

        try {
            assert(!provider.isRunning, `isRunning in bad initial state`);
            await provider.start();
            assert(provider.isRunning, `isRunning not set`);
            await done.promise;
        } finally {
            provider.stop();
            assert(!provider.isRunning, `isRunning not cleared after stop()`);
        }
    });

    it("Should return timestamp", async () => {
        const provider = new TestTimestampProvider();
        try {
            await provider.start();
            const timestamp = provider.getTimestamp();
            const source = provider.time.getTime();
            assert(
                timestamp >= source && timestamp <= source + 5,
                `Timestamp of ${timestamp} doesn't match source of ${source}`
            );
        } finally {
            provider.stop();
        }
    });

    it("Should throw exception for getTimestamp() if not started", (done) => {
        const provider = new TestTimestampProvider();
        try {
            const timestamp = provider.getTimestamp();
            assert(false, `Returned a timestamp of ${timestamp}`);
        } catch {
            done();
        }
    });

    it("Should never return older timestamps", async () => {
        const provider = new TestTimestampProvider();
        try {
            await provider.start();
            let previous = 0;
            for (let i = 0; i < 5; i++) {
                const timestamp = provider.getTimestamp();
                assert(
                    timestamp > previous,
                    `Returned a timestamp of ${timestamp}. Previous was ${previous}`
                );
                previous = timestamp;
            }
        } finally {
            provider.stop();
        }
    });

    it("Should return timestampError", async () => {
        const provider = new TestTimestampProvider();
        try {
            await provider.start();
            const error = provider.getMaxTimestampError();
            assert(error <= 1, `Returned a timestamp error of ${error}.`);
        } finally {
            provider.stop();
        }
    });

    it("Should throw exception for getMaxTimestampError() if not started", (done) => {
        const provider = new TestTimestampProvider();
        try {
            const error = provider.getMaxTimestampError();
            assert(false, `Returned a timestamp error of ${error}`);
        } catch {
            done();
        }
    });
});
