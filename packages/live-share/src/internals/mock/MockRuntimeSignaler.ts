/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IInboundSignalMessage } from "@fluidframework/runtime-definitions/internal";
import { MockLogger } from "@fluidframework/telemetry-utils/internal";
import { IRuntimeSignaler } from "../LiveEventScope.js";
import { v4 } from "uuid";
import { ITelemetryBaseLogger } from "@fluidframework/azure-client";

export class MockRuntimeSignaler implements IRuntimeSignaler {
    private _connected: MockRuntimeSignaler[] = [];
    private _signalListeners: ((
        message: IInboundSignalMessage,
        local: boolean
    ) => void)[] = [];
    private _connectedListeners: ((clientId: string) => void)[] = [];

    public constructor(hasClientId = true, isConnected = true) {
        this.clientId = hasClientId ? v4() : undefined;
        this.connected = isConnected;
        this.logger = new MockLogger();
    }

    public clientId: string | undefined;
    public connected: boolean;
    public logger: ITelemetryBaseLogger;

    public connect(): void {
        if (!this.connected) {
            this.connected = true;
            this.clientId = v4();
            this._connectedListeners.forEach((fn) => fn(this.clientId!));
        }
    }

    public on(event: "connected", listener: (clientId: string) => void): this;
    // Note: the following is not actually a duplicate
    // eslint-disable-next-line no-dupe-class-members
    public on(
        event: "signal",
        listener: (message: IInboundSignalMessage, local: boolean) => void
    ): this;
    // Note: the following is not actually a duplicate
    // eslint-disable-next-line no-dupe-class-members
    public on(event: string, listener: any) {
        switch (event) {
            case "connected":
                this._connectedListeners.push(listener);
                break;
            case "signal":
                this._signalListeners.push(listener);
                break;
        }
        return this;
    }
    public off(event: string, listener: any) {
        switch (event) {
            case "connected":
                this._connectedListeners.find(
                    (cListener) => cListener !== listener
                );
                break;
            case "signal":
                this._signalListeners.find(
                    (cListener) => cListener !== listener
                );
                break;
        }
        return this;
    }

    public submitSignal(type: string, content: any): void {
        const msg: IInboundSignalMessage = {
            clientId: this.clientId || null,
            content: content,
            type: type,
        };

        // Raise local event
        this.emit(msg, true);

        // Raise remote events
        this._connected.forEach((runtime) => runtime.emit(msg, false));
    }

    private emit(message: IInboundSignalMessage, local: boolean): void {
        this._signalListeners.forEach((fn) => fn(message, local));
    }

    public static connectRuntimes(runtimes: MockRuntimeSignaler[]): void {
        for (let i = 0; i < runtimes.length; i++) {
            const rt = runtimes[i];
            for (let j = 0; j < runtimes.length; j++) {
                const other = runtimes[j];
                if (rt != other) {
                    rt._connected.push(other);
                }
            }
        }
    }
}
