/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ITimestampProvider } from "../interfaces";
import { TeamsClientApi, TestTeamsClientApi } from "./TestTeamsClientApi";

const SHARED_CLOCK_IMPROVE_ACCURACY_INTERVAL =  5 * 1000;
const SHARED_CLOCK_IMPROVE_ACCURACY_ATTEMPTS = 5;

interface IServerTimeOffset {
  offset: number;
  serverTimeInUtc: number;
  localTimeInUtc: number;
  requestLatency: number;
}

export class SharedClock implements ITimestampProvider {
    private _teamsClient?: TeamsClientApi;
    private _serverTime?: IServerTimeOffset;
    private _syncTimer?: any;
    private _retries = 0;
    private _lastTimeSent = 0;

    /**
     * Returns true if the clock has been started.
     */
     public isRunning(): boolean {
        return !!this._serverTime;
    }

    /**
     * Returns the current server time.
     */
    public getTimestamp(): number {
        if (!this._serverTime) {
            throw new Error(`SharedClock: can't call getTime() before calling start().`);
        }

        // Return adjusted timestamp
        // - We're remember the last time we sent and returning that if we ever predict an earlier time.
        //   This can happen if our accuracy improves and we end up with a smaller offset then before.
        return this._lastTimeSent = Math.max(new Date().getTime() + this._serverTime.offset, this._lastTimeSent);
    }
    

    /**
     * Starts the clock
     */
    public async start(): Promise<void> {
        this.stop();
        performance.mark(`TeamsSync: starting clock`);
        try {
            await this.improveAccuracy();
        } finally {
            performance.measure(`TeamsSync: clock startup`, `TeamsSync: starting clock`);
        }
    }

    /**
     * Stops the clock if its running.
     */
    public stop(): void {
        this._serverTime = undefined;
        this._retries = 0;
        if (this._syncTimer) {
            clearTimeout(this._syncTimer);
            this._syncTimer = undefined;
        }
    }

    private async improveAccuracy(): Promise<void> {
        // Check for a more accurate time offset.
        const offset = await this.getSessionTimeOffset();
        if (!this._serverTime || offset.requestLatency < this._serverTime.requestLatency) {
            // We got a more accurate time offset.
            //this.logger.trace(`SharedClock accuracy improved to ${offset.offset}ms by latency of ${offset.requestLatency}ms.`);
            this._serverTime = offset;
            this._retries = 0;
        } else {
            // We got back an equal or less accurate time offset.
            this._retries++;
        }

        // Start sync timer timer
        if (this._retries <= SHARED_CLOCK_IMPROVE_ACCURACY_ATTEMPTS) {
            this._syncTimer = setTimeout(this.improveAccuracy.bind(this), SHARED_CLOCK_IMPROVE_ACCURACY_INTERVAL);
        }
        else
        {
            this._syncTimer = undefined;
        }
    }

    private async getSessionTimeOffset(): Promise<IServerTimeOffset> {
        const teamsClient = await this.getTeamsClient();

        // Get time from server and measure request time
        const startCall = performance.now();
        const serverTime = await teamsClient.interactive.getNtpTime();
        const endCall = performance.now();
        const now = new Date().getTime();

        console.log(`getNtpTime: ${JSON.stringify(serverTime)}`);

        // Compute request latency and session time.
        const requestLatency = endCall - startCall;
        const serverTimeInUtc = serverTime.ntpTimeInUTC + Math.floor(requestLatency/2);

        // Return offset
        return {
            serverTimeInUtc: serverTimeInUtc,
            localTimeInUtc: now,
            requestLatency: requestLatency,
            offset: serverTimeInUtc - now
        };
    }

    private async getTeamsClient(): Promise<TeamsClientApi> {
        if (!this._teamsClient) {
            if (window) {
                this._teamsClient = await import('@microsoft/teams-js');
            } else {
                this._teamsClient = new TestTeamsClientApi();
            }
        }

        return this._teamsClient;
    } 
}
