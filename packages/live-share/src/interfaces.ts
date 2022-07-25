/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
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
     * Current client ID, if known. The client ID will be `undefined` if the client is currently disconnected.
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
    /**
     * The user is an external guest user.
     */
    guest = 'Guest',

    /**
     * The user is a standard meeting attendee.
     */
    attendee = 'Attendee',

    /**
     * The user has presenter privileges for the meeting.
     */
    presenter = 'Presenter',

    /**
     * The user is a meeting organizer.
     */
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

    /**
     * Returns the maximum number of milliseconds a returned timestamp can be off from the source.
     */
    getMaxTimestampError(): number;
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
     * Registers client of the current user.
     * @param clientId Client ID to map to current user.
     * @returns The list of roles for the client.
     */
     registerClientId(clientId: string): Promise<UserMeetingRole[]>;

    /**
     * Verifies that a client has one of the specified roles. 
     * @param clientId Client ID to inspect.
     * @param allowedRoles User roles that are allowed.
     * @returns True if the client has one of the specified roles.
     */
    verifyRolesAllowed(clientId: string, allowedRoles: UserMeetingRole[]): Promise<boolean>;
}
