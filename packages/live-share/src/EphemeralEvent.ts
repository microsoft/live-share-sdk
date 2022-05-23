/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { IEvent } from "@fluidframework/common-definitions";
import { LocalTimestampProvider } from "./LocalTimestampProvider";
import { IEphemeralEvent, ITimestampProvider, IRoleVerifier, UserMeetingRole } from "./interfaces";
import { EphemeralEventScope } from './EphemeralEventScope';
import { EphemeralEventTarget } from './EphemeralEventTarget';
import { LocalRoleVerifier } from './LocalRoleVerifier';

/**
 * Events supported by [[EphemeralEvent]] object.
 */
export enum EphemeralEventEvents {
    /**
     * An event has been sent or received.
     */
    received = 'received'
}

/**
 * Event typings for [[EphemeralEvent]] class.
 * @template TEvent Type of event to broadcast.
 */
export interface IEphemeralEventEvents<TEvent extends IEphemeralEvent> extends IEvent {
    /**
     * A remote event was received or a local event was sent.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.evt The event that was sent/received.
     * @param listener.local If true the `evt` is an event that was sent.
     */
    (event: 'received', listener: (evt: TEvent, local: boolean) => void): any;
}

/**
 * Ephemeral fluid object that broadcasts an event to other clients and a set of static event 
 * related helpers.
 * 
 * #### remarks
 * Applications should call `on('received', (evt, local) => {})` to listen for local events sent 
 * and remote events received. Events aren't guaranteed to be delivered so you should limit their 
 * use to sending events you're ok with potentially being missed. Reactions are a good use case for
 * `EphemeralEvents`. Use something like the [[EphemeralState]] class when syncing state. 
 * @template TEvent Type of event to broadcast.
 */
 export class EphemeralEvent<TEvent extends IEphemeralEvent = IEphemeralEvent> extends DataObject<{Events: IEphemeralEventEvents<TEvent>}> {
    private static _timestampProvider: ITimestampProvider = new LocalTimestampProvider();
    private static _roleVerifier: IRoleVerifier = new LocalRoleVerifier();
    
    private _eventTarget?: EphemeralEventTarget<TEvent>; 

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:EphemeralEvent`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        EphemeralEvent.TypeName,
        EphemeralEvent,
        [],
        {}
    );

    /**
     * Returns true if the object has been started.
     */
    public get isStarted(): boolean {
        return !!this._eventTarget;
    } 

    /**
     * Starts the object.
     * @param allowedRoles Optional. List of roles allowed to send events.
     */
     public start(allowedRoles?: UserMeetingRole[]): Promise<void> {
        if (this._eventTarget) {
            throw new Error(`EphemeralEvent already started.`);
        }

        const scope = new EphemeralEventScope(this.runtime, allowedRoles);
        this._eventTarget = new EphemeralEventTarget(scope, 'event', (evt, local) => {
            this.emit(EphemeralEventEvents.received, evt, local);
        });

        return Promise.resolve();
    }

    /**
     * Broadcasts an event to all other clients.
     * 
     * #### remarks
     * The event will be queued for delivery if the client isn't currently connected.
     * @param evt Optional. Event to send. If omitted, an event will still be sent but it won't 
     * include any custom event data. 
     * @returns The full event object that was sent, including the timestamp of when the event 
     * was sent and the clientId if known. The clientId will be `undefined` if the client is 
     * disconnected at time of delivery.
     */
    public sendEvent(evt?: Partial<TEvent>): TEvent {
        if (!this._eventTarget) {
            throw new Error(`EphemeralEvent not started.`);
        }

        return this._eventTarget.sendEvent(evt);
    }

    /**
     * Returns the current timestamp as the number of milliseconds sine the Unix Epoch.
     */
    public static getTimestamp(): number {
        return EphemeralEvent._timestampProvider.getTimestamp();
    }

    /**
     * Returns the list of roles supported for a client.
     * @param clientId Client ID to lookup.
     * @returns The list of roles for the client.
     */
    public static getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        return EphemeralEvent._roleVerifier.getClientRoles(clientId);
    }

    /**
     * Verifies that a client has one of the specified roles. 
     * @param clientId Client ID to inspect.
     * @param allowedRoles User roles that are allowed.
     * @returns True if the client has one of the specified roles.
     */
    public static verifyRolesAllowed(clientId: string, allowedRoles: UserMeetingRole[]): Promise<boolean> {
        return EphemeralEvent._roleVerifier.verifyRolesAllowed(clientId, allowedRoles);
    }
     
    /**
     * Returns true if a received event is newer then the current event.
     * 
     * #### remarks
     * Used when building new Ephemeral objects to process state change events. The `isNewer()` 
     * method implements an algorithm that deals with conflicting events that have the same timestamp
     * and older events that should have debounced the current event.
     * 
     * - When the received event has the same timestamp as the current event, each events clientId 
     *   will be used as a tie breaker. The clientId containing the lower sort order wins any ties.
     * - Older events are generally ignored unless a debounce period is specified. An older event 
     *   that should have debounced the current event will be considered newer.
     * 
     * The algorithm employed by isNewer() helps ensure that all clients will eventually reach a 
     * consistent state with one other. 
     * @param current Current event to compare received event against.
     * @param received Received event.
     * @param debouncePeriod Optional. Time in milliseconds to ignore any new events for. Defaults to 0 ms.
     * @returns True if the received event is newer then the current event and should replace the current one. 
     */
    public static isNewer(current: IEphemeralEvent|undefined, received: IEphemeralEvent, debouncePeriod = 0): boolean {
        if (current) {
            if (current.timestamp == received.timestamp) {
                // In a case where both clientId's are blank that's the local client in a disconnected state
                const cmp = (current.clientId || '').localeCompare(received.clientId || '');
                if (cmp < 0) {
                    // cmp == 0 is same user and we want to take latest event from a given user.
                    // cmp > 0 is a tie breaker so we'll take that event as well (comparing 'a' with 'c' 
                    // will result in a negative value).
                    return false;
                }
            } else if (current.timestamp > received.timestamp) {
                // Did we receive an older event that should have caused us to debounce the current one?
                const delta = current.timestamp - received.timestamp;
                if (delta > debouncePeriod) {
                    return false;
                }
            } else {
                // Is the new event within the debounce period?
                const delta =  received.timestamp - current.timestamp;
                if (delta < debouncePeriod) {
                    return false;
                }
            }
        } 

        return true;
    }

    /**
     * @hidden
     * Assigns a new timestamp provider.
     */
    public static setTimestampProvider(provider: ITimestampProvider): void {
        EphemeralEvent._timestampProvider = provider;
    }

    /**
     * @hidden
     * Assigns a new role verifier.
     */
    public static setRoleVerifier(provider: IRoleVerifier): void {
        EphemeralEvent._roleVerifier = provider;
    }
}