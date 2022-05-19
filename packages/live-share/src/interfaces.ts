/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Base interface for all event objects. 
 */
export interface IEvent {
    /**
     * Additional event properties.
     */
    [key:string]: any;

    /**
     * Name of the event.
     */
    name: string;
}
  
/**
 * Base interface for all ephemeral events.
 */
export interface IEphemeralEvent extends IEvent {
    /**
     * Current client ID, if known. The client ID will be `undefined` if teh client is currently disconnected.
     */
    clientId?: string;

    /**
     * Global timestamp of when the event was sent.
     */
    timestamp: number;
}

/**
 * Removes the base properties from an event that derives from `IEphemeralEvent`.
 * @template TEvent Type of event.
 */
export type OutgoingEphemeralEvent<TEvent extends IEphemeralEvent> = Omit<TEvent, 'name' | 'clientId' | 'timestamp'>; 

/**
 * Allowed roles during a meeting.
 */
export enum UserMeetingRole {
    guest = 'Guest',
    attendee = 'Attendee',
    presenter = 'Presenter',
    organizer = 'Organizer',
}

/**
 * @hidden
 * A provider that generates timestamps. 
 */
export interface ITimestampProvider {
    /**
     * Returns the current timestamp as the number of milliseconds sine the Unix Epoch.
     */
    getTimestamp(): number;
}

/**
 * @hidden
 * A provider that verifies roles.
 */
export interface IRoleVerifier {
    /**
     * Returns the list of roles supported for a client.
     * @param clientId Client ID to lookup.
     * @returns The list of roles for the client.
     */
    getClientRoles(clientId: string): Promise<UserMeetingRole[]>;

    /**
     * Verifies that a client has one of the specified roles. 
     * @param clientId Client ID to inspect.
     * @param allowedRoles User roles that are allowed.
     * @returns True if the client has one of the specified roles.
     */
    verifyRolesAllowed(clientId: string, allowedRoles: UserMeetingRole[]): Promise<boolean>;
}
