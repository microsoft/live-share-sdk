/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IInboundSignalMessage } from "@fluidframework/runtime-definitions/internal";
import { IContainerRuntimeSignaler } from "../../interfaces.js";
import { v4 } from "uuid";

export class MockContainerRuntimeSignaler implements IContainerRuntimeSignaler {
    private _connected: MockContainerRuntimeSignaler[] = [];
    private _listeners: ((
        message: IInboundSignalMessage,
        local: boolean
    ) => void)[] = [];
    private _sentSignals: IInboundSignalMessage[] = [];
    private _receivedSignals: IInboundSignalMessage[] = [];

    public constructor(hasClientId = true) {
        this.clientId = hasClientId ? v4() : undefined;
    }

    public clientId: string | undefined;

    public getSentSignals(type: string): IInboundSignalMessage[] {
        return this._sentSignals.filter((message) => message.type == type);
    }

    public getReceivedSignals(type: string): IInboundSignalMessage[] {
        return this._receivedSignals.filter((message) => message.type == type);
    }

    public on(
        event: "signal",
        listener: (message: IInboundSignalMessage, local: boolean) => void
    ): this {
        this._listeners.push((message, local) => {
            if (local) {
                this._sentSignals.push(message);
            } else {
                this._receivedSignals.push(message);
            }
            listener(message, local);
        });
        return this;
    }

    public off(
        event: "signal",
        listener: (message: IInboundSignalMessage, local: boolean) => void
    ): this {
        // DO NOTHING FOR THIS MOCK
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
        this._listeners.forEach((fn) => fn(message, local));
    }

    public static connectContainers(
        runtimes: MockContainerRuntimeSignaler[]
    ): void {
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
