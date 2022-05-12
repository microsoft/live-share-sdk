/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface ITimestampProvider {
    /**
     * Returns the current timestamp as the number of milliseconds sine the Unix Epoch.
     */
    getTimestamp(): number;

}
export interface IEvent {
    [key:string]: any;
    name: string;
}
  
export interface IEphemeralEvent extends IEvent {
    clientId?: string;
    timestamp: number;
}

export interface IRolesService {
    registerClientId(clientId: string): Promise<UserMeetingRole[]>;
    verifyClientRoles(clientId: string, roles: UserMeetingRole[]): Promise<boolean>;
}

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

/**
 * Allowed roles during a meeting.
 */
export enum UserMeetingRole {
    guest = 'Guest',
    attendee = 'Attendee',
    presenter = 'Presenter',
    organizer = 'Organizer',
}
