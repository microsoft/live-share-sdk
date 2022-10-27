/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveShareHost, INtpTimeInfo, ITimestampProvider } from "./interfaces";

const IMPROVE_ACCURACY_INTERVAL = 5 * 1000;
const IMPROVE_ACCURACY_ATTEMPTS = 5;

/**
 * @hidden
 */
interface IServerTimeOffset {
    offset: number;
    serverTimeInUtc: number;
    localTimeInUtc: number;
    requestLatency: number;
}

/**
 * Default `ITimestampProvider` implementation.
 *
 */
export class DefaultTimestampProvider implements ITimestampProvider {
    private readonly _host: ILiveShareHost;
    private _serverTime?: IServerTimeOffset;
    private _syncTimer?: any;
    private _retries = 0;
    private _lastTimeSent = 0;

    /**
     * Creates a new `DefaultTimestampProvider` instance.
     * @param host The current Live Share Host instance.
     */
    public constructor(host: ILiveShareHost) {
        this._host = host;
    }

    /**
     * Returns true if the provider has been started.
     */
    public isRunning(): boolean {
        return !!this._serverTime;
    }

    /**
     * Returns the current server time as a UTC tick.
     */
    public getTimestamp(): number {
        if (!this._serverTime) {
            throw new Error(
                `DefaultTimestampProvider: can't call getTimestamp() before calling initialize().`
            );
        }

        // Return adjusted timestamp and save last
        // - We never want to generate the same timestamp twice and we always want a greater
        //   timestamp then what we previously sent. This can happen if our accuracy improves
        //   and we end up with a smaller offset then before.
        return (this._lastTimeSent = Math.max(
            new Date().getTime() + this._serverTime.offset,
            this._lastTimeSent + 1
        ));
    }

    /**
     * Returns the maximum amount of error, in milliseconds.
     */
    public getMaxTimestampError(): number {
        if (!this._serverTime) {
            throw new Error(
                `DefaultTimestampProvider: can't call getMaxTimestampError() before calling initialize().`
            );
        }

        return Math.floor(this._serverTime.requestLatency / 2);
    }

    /**
     * Starts the provider.
     */
    public async start(): Promise<void> {
        this.stop();
        performance.mark(`TeamsSync: starting clock`);
        try {
            await this.improveAccuracy();
        } finally {
            performance.measure(
                `TeamsSync: clock startup`,
                `TeamsSync: starting clock`
            );
        }
    }

    /**
     * Stops the provider if its running.
     */
    public stop(): void {
        this._serverTime = undefined;
        this._retries = 0;
        if (this._syncTimer) {
            clearTimeout(this._syncTimer);
            this._syncTimer = undefined;
        }
    }

    /**
     * Returns the hosts computed 
     * @returns 
     */
    protected getNtpTime(): Promise<INtpTimeInfo> {
        return this._host.getNtpTime();
    }

    /**
     * Called in a loop to improve the accuracy of the clients timestamp offset.
     *
     * The function will periodically call itself until we go 5 times without an improvement
     * to the calculated timestamp offset.
     */
    private async improveAccuracy(): Promise<void> {
        // Check for a more accurate time offset.
        const offset = await this.getSessionTimeOffset();
        if (
            !this._serverTime ||
            offset.requestLatency < this._serverTime.requestLatency
        ) {
            // We got a more accurate time offset.
            //this.logger.trace(`SharedClock accuracy improved to ${offset.offset}ms by latency of ${offset.requestLatency}ms.`);
            this._serverTime = offset;
            this._retries = 0;
        } else {
            // We got back an equal or less accurate time offset.
            this._retries++;
        }

        // Start sync timer timer
        if (this._retries <= IMPROVE_ACCURACY_ATTEMPTS) {
            this._syncTimer = setTimeout(
                this.improveAccuracy.bind(this),
                IMPROVE_ACCURACY_INTERVAL
            );
        } else {
            this._syncTimer = undefined;
        }
    }

    /**
     * Fetches the current timestamp from central timestamp service and computes the local offset.
     * @returns Computed timestamp offset.
     */
     private async getSessionTimeOffset(): Promise<IServerTimeOffset> {
        // Get time from server and measure request time
        const startCall = performance.now();
        const serverTime = await this.getNtpTime();
        const endCall = performance.now();
        const now = new Date().getTime();

        // Compute request latency and session time.
        const requestLatency = endCall - startCall;
        const serverTimeInUtc =
            serverTime.ntpTimeInUTC + Math.floor(requestLatency / 2);

        // Return offset
        return {
            serverTimeInUtc: serverTimeInUtc,
            localTimeInUtc: now,
            requestLatency: requestLatency,
            offset: serverTimeInUtc - now,
        };
    }
}
