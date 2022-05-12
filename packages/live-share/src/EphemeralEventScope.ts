/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import EventEmitter from "events";
import { IErrorEvent, ITelemetryLogger } from "@fluidframework/common-definitions";
import { TypedEventEmitter } from "@fluidframework/common-utils";
import { IInboundSignalMessage } from "@fluidframework/runtime-definitions";
import { IEphemeralEvent, UserMeetingRole } from "./interfaces";
import { EphemeralEvent } from "./EphemeralEvent";

export type EphemeralEventListener<T extends IEphemeralEvent> = (evt: T, local: boolean) => void;

/**
 * Duck type of something that provides the expected signalling functionality:
 * A way to verify we can signal, a way to send a signal, and a way to listen for incoming signals
 */
export interface IRuntimeSignaler {
    readonly clientId: string|undefined;
    readonly connected: boolean;
    readonly logger: ITelemetryLogger;
    on(event: "signal", listener: (message: IInboundSignalMessage, local: boolean) => void): this;
    submitSignal(type: string, content: any): void;
}

export class EphemeralEventScope extends TypedEventEmitter<IErrorEvent> {
    private readonly emitter  = new EventEmitter();
    private readonly _runtime: IRuntimeSignaler;
    private _allowedRoles: UserMeetingRole[];

    public get allowedRoles(): UserMeetingRole[] {
        return this._allowedRoles;
    }

    public set allowedRoles(values: UserMeetingRole[]) {
        this._allowedRoles = values;
    }

    public get clientId(): string | undefined {
        return this._runtime.clientId;
    }

    constructor(runtime: IRuntimeSignaler, allowedRoles?: UserMeetingRole[]) {
        super();
        this._runtime = runtime;
        this._allowedRoles = allowedRoles || [];
        this.emitter.on("error", (error) => {
            this.emit("error", error);
        });
        this._runtime.on("signal", (message, local) => {
            // We don't trust the clientId in the message content as it could have been tampered
            // with (in fact it could be missing if the message was queued when disconnected.) 
            // We'll overwrite the contents clientId with the messages clientId which can't be 
            // spoofed. 
            const clientId = message.clientId;
            (message.content as IEphemeralEvent).clientId = clientId as string;

            // Only call listeners when the runtime is connected and if the signal has an
            // identifiable sender clientId.  The listener is responsible for deciding how
            // it wants to handle local/remote signals
            // eslint-disable-next-line no-null/no-null
            if (this._runtime.connected && clientId !== null) {
                EphemeralEvent.verifyRolesAllowed(clientId, this._allowedRoles).then((value) => {
                    if (value) {
                        this.emitter.emit(message.type, message.content, local);
                    } else {
                        this._runtime.logger.sendErrorEvent({eventName: 'SharedEvent:invalidRole' }, new Error(`The clientId of "${clientId}" doesn't have a role of ${JSON.stringify(this._allowedRoles)}.`));
                    }
                }).catch((err) => {
                    this._runtime.logger.sendErrorEvent({eventName: 'SharedEvent:invalidRole' }, err);
                });
            }            
        });
    }

    public onEvent<T extends IEphemeralEvent>(eventName: string, listener: EphemeralEventListener<T>): this {
        this.emitter.on(eventName, listener);
        return this;
    }

    public offEvent<T extends IEphemeralEvent>(eventName: string, listener: EphemeralEventListener<T>): this {
        this.emitter.off(eventName, listener);
        return this;
    }

    public sendEvent<T extends IEphemeralEvent>(eventName: string, evt: Partial<T> = {}): T {
        // Clone passed in event and fill out required props.
        const clone: T = {
            ...evt as T, 
            clientId: this._runtime.clientId,
            name: eventName,
            timestamp: EphemeralEvent.getTimestamp() 
        };
        
        // Send event
        this._runtime.submitSignal(eventName, clone);

        return clone;
    }
}
