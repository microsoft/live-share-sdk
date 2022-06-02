/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITelemetryLogger } from '@fluidframework/common-definitions';
import { IInboundSignalMessage } from '@fluidframework/runtime-definitions';
import { MockLogger } from "@fluidframework/telemetry-utils";
import { IRuntimeSignaler } from '@microsoft/live-share';
import { v4 } from 'uuid';

export class MockRuntimeSignaler implements IRuntimeSignaler {
    private _connected: MockRuntimeSignaler[] = [];
    private _listeners: ((message: IInboundSignalMessage, local: boolean) => void)[] = [];

    public constructor(hasClientId = true, isConnected = true) {
        this.clientId = hasClientId ? v4() : undefined;
        this.connected = isConnected;
        this.logger = new MockLogger();
    }

    public clientId: string|undefined;
    public connected: boolean;
    public logger: ITelemetryLogger;

    public on(event: 'signal', listener: (message: IInboundSignalMessage, local: boolean) => void): this {
        this._listeners.push(listener);
        return this;
    }
    
    public submitSignal(type: string, content: any): void {
        const msg: IInboundSignalMessage = {
            clientId: this.clientId || null,
            content: content,
            type: type
        }

        // Raise local event
        this.emit(msg, true);

        // Raise remote events
        this._connected.forEach(runtime => runtime.emit(msg, false));
    }

    private emit(message: IInboundSignalMessage, local: boolean): void {
        this._listeners.forEach(fn => fn(message, local));
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