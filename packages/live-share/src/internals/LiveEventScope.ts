/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    IErrorEvent,
    ITelemetryBaseLogger,
} from "@fluidframework/core-interfaces";
import { TypedEventEmitter } from "@fluid-internal/client-utils";
import { IInboundSignalMessage } from "@fluidframework/runtime-definitions/internal";
import { ILiveEvent, UserMeetingRole } from "../interfaces.js";
import { LiveShareRuntime } from "./LiveShareRuntime.js";
import { IEvent } from "@fluidframework/core-interfaces";
import { LiveTelemetryLogger } from "../LiveTelemetryLogger.js";
import { isILiveEvent } from "./type-guards.js";
import { waitUntilConnected } from "./utils.js";

/**
 * Live event callback.
 * @template TEvent Type of event being sent/received.
 * @param evt The event that was sent/received.
 * @param local If true the `evt` is an event that was sent.
 */
export type LiveEventListener<TEvent> = (
    evt: ILiveEvent<TEvent>,
    local: boolean
) => void;

/**
 * Duck type of something that provides the expected signalling functionality:
 * A way to verify we can signal, a way to send a signal, and a way to listen for incoming signals
 */
export interface IRuntimeSignaler {
    readonly clientId: string | undefined;
    readonly connected: boolean;
    readonly logger: ITelemetryBaseLogger;
    on(event: "connected", listener: (clientId: string) => void): this;
    off(event: "connected", listener: (clientId: string) => void): this;
    on(
        event: "signal",
        listener: (message: IInboundSignalMessage, local: boolean) => void
    ): this;
    submitSignal(type: string, content: any): void;
}

/**
 * @hidden
 */
interface ILiveEventInternalEmitterEvents extends IEvent {
    /**
     * Event listener for error events
     * @param event update
     * @param listener listener function
     * @param listener.error the error instance
     */
    (event: "error", listener: (error: any) => void): void;
    /**
     * Event listener for events emitted through `LiveEventScope`
     * @param event update
     * @param listener listener function
     * @param listener.event the event instance
     * @param listener.local whether the event was initiated from the local client
     */
    (event: string, listener: (event: any, local: boolean) => void): void;
}

/**
 * Object responsible for sending and receiving live share events.
 *
 * @remarks
 * Live objects send and receive events using an event scope. Event scopes can be restricted
 * to only receive events from clients with specific roles. Any events that are received from
 * clients without an allowed role type will be ignored.
 *
 * Event scopes are isolated on a per Fluid object basis. That means that two different Fluid
 * objects using the same event names don't have to worry about collisions.  Two event scopes
 * within the same Fluid object, however, don't have any isolation. You can use multiple event
 * scopes within the same FLuid object, you just need to be careful that they send different
 * events.
 */
export class LiveEventScope extends TypedEventEmitter<IErrorEvent> {
    private readonly emitter =
        new TypedEventEmitter<ILiveEventInternalEmitterEvents>();
    private readonly _runtime: IRuntimeSignaler;
    private _allowedRoles: UserMeetingRole[];
    private _logger: LiveTelemetryLogger;

    /**
     * Only throw role validation failed errors for events that are associated with this scope.
     * Useful for dataObjects that use multiple scopes, like LiveMediaSession.
     */
    private throwForEvents: string[] = [];

    /**
     * Creates a new `LiveEventScope` instance.
     * @param runtime A Fluid objects runtime instance, typically `this.runtime`.
     * @param allowedRoles Optional. List of roles allowed to send events using this scope.
     * You should use a second scope if you need mixed permission support.
     */
    constructor(
        runtime: IRuntimeSignaler,
        private _liveRuntime: LiveShareRuntime,
        allowedRoles?: UserMeetingRole[]
    ) {
        super();
        this._runtime = runtime;
        this._allowedRoles = allowedRoles || [];
        this._logger = new LiveTelemetryLogger(runtime, _liveRuntime);
        this.emitter.on("error", (error) => {
            this.emit("error", error);
        });
        this._runtime.on("signal", (message, local) => {
            if (!message.clientId || !this._runtime.connected) return;
            // We don't trust the clientId in the message content as it could have been tampered
            // with (in fact it could be missing if the message was queued when disconnected.)
            // We'll overwrite the contents clientId with the messages clientId which can't be
            // spoofed.
            const clientId = message.clientId;

            if (isILiveEvent(message.content)) {
                const content = message.content;
                content.clientId = clientId;
                this.emitToListeners(clientId, content, local);
            }
        });
    }

    /**
     * List of roles allowed to send events through this scope.
     */
    public get allowedRoles(): UserMeetingRole[] {
        return this._allowedRoles;
    }

    public set allowedRoles(values: UserMeetingRole[]) {
        this._allowedRoles = values;
    }

    /**
     * The runtimes current client ID. This will be `undefined` if the client is disconnected.
     */
    public get clientId(): string | undefined {
        return this._runtime.clientId;
    }

    /**
     * Registers a listener for a named event.
     * @template TEvent Type of event to listen for.
     * @param eventName Name of event to listen for.
     * @param listener Function to call when the named event is sent or received.
     */
    public onEvent<TEvent>(
        eventName: string,
        listener: LiveEventListener<TEvent>
    ): this {
        this.throwForEvents.push(eventName);
        this.emitter.on(eventName, listener);
        return this;
    }

    /**
     * Un-registers a listener for a named event.
     * @template TEvent Type of event being listened for.
     * @param eventName Name of event to un-register.
     * @param listener Function that was originally passed to `onEvent()`.
     */
    public offEvent<TEvent>(
        eventName: string,
        listener: LiveEventListener<TEvent>
    ): this {
        this.emitter.off(eventName, listener);
        const removeIndex = this.throwForEvents.indexOf(eventName);
        if (removeIndex >= 0) {
            this.throwForEvents.splice(removeIndex, 1);
        }
        return this;
    }

    /**
     * Sends an event to other event scope instances for the Fluid object.
     * @template TEvent Type of event to send.
     * @param eventName Name of the event to send.
     * @param evt Optional. Partial event object to send. The `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId`
     * fields will be automatically populated prior to sending.
     * @returns The full event, including `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId` fields if known.
     */
    public async sendEvent<TEvent>(
        eventName: string,
        evt: TEvent
    ): Promise<ILiveEvent<TEvent>> {
        const event = await this.createEvent(eventName, evt);
        // Send event
        this._runtime.submitSignal(eventName, event);
        return event;
    }

    /**
     * Sends a local only event to local event scope instance for the Fluid object.
     * @template TEvent Type of event to send.
     * @param eventName Name of the event to send.
     * @param evt Optional. Partial event object to send. The `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId`
     * fields will be automatically populated prior to sending.
     * @returns The full event, including `ILiveEvent.name`,
     * `ILiveEvent.timestamp`, and `ILiveEvent.clientId` fields if known.
     */
    public async sendLocalEvent<TEvent>(
        eventName: string,
        evt: TEvent
    ): Promise<ILiveEvent<TEvent>> {
        const event = await this.createEvent(eventName, evt);
        // Send event to local client only, without using signals
        this.emitToListeners(event.clientId, event, true);
        return event;
    }

    private async createEvent<TEvent>(
        eventName: string,
        evt: TEvent
    ): Promise<ILiveEvent<TEvent>> {
        const clientId = await this.waitUntilConnected();
        const isAllowed = await this._liveRuntime.verifyRolesAllowed(
            clientId,
            this._allowedRoles
        );
        if (!isAllowed) {
            throw new Error(
                `The local user doesn't have a role of ${JSON.stringify(
                    this._allowedRoles
                )}.`
            );
        }
        // Clone passed in event and fill out required props.
        const clone: ILiveEvent<TEvent> = {
            clientId,
            name: eventName,
            timestamp: this._liveRuntime.getTimestamp(),
            data: evt,
        };

        return clone;
    }

    private waitUntilConnected(): Promise<string> {
        return waitUntilConnected(this._runtime);
    }

    private emitToListeners(
        clientId: string,
        event: ILiveEvent,
        local: boolean
    ) {
        // Only call listeners when the runtime is connected and if the signal has an
        // identifiable sender clientId.  The listener is responsible for deciding how
        // it wants to handle local/remote signals
        this._liveRuntime
            .verifyRolesAllowed(clientId, this._allowedRoles)
            .then((value) => {
                if (value) {
                    this.emitter.emit(event.name, event, local);
                } else if (this.throwForEvents.includes(event.name)) {
                    const error = new Error(
                        `The clientId of "${clientId}" doesn't have a role of ${JSON.stringify(
                            this._allowedRoles
                        )}.`
                    );
                    this._logger.sendErrorEvent(
                        "LiveEvent:invalidRole",
                        new Error(
                            `The clientId of "${clientId}" doesn't have a role of ${JSON.stringify(
                                this._allowedRoles
                            )}.`
                        )
                    );
                }
            })
            .catch((err) => {
                this._logger.sendErrorEvent("LiveEvent:invalidRole", err);
            });
    }
}
