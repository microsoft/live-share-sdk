/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IRoleVerifier, UserMeetingRole } from "./interfaces";

/**
 * @hidden
 * Implements a local role verifier for testing purposes.
 */
export class LocalRoleVerifier implements IRoleVerifier {
    private roleCache: Map<string, UserMeetingRole[]> = new Map();

    constructor(noWarn = false) {
        if (noWarn) {
            LocalRoleVerifier._warned = true;
        }
    }

    public defaultRoles: UserMeetingRole[] = [
        UserMeetingRole.organizer,
        UserMeetingRole.presenter,
        UserMeetingRole.attendee,
    ];

    public addClient(clientId: string, roles: UserMeetingRole[]): this {
        this.roleCache.set(clientId, roles);
        return this;
    }

    public getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        LocalRoleVerifier.ensureWarned();

        if (!clientId) {
            throw new Error(`LocalRoleVerifier: called getClientRoles() without a clientId`);
        }

        let roles: UserMeetingRole[];
        if (this.roleCache.has(clientId)) {
            roles = this.roleCache.get(clientId)!;
        } else {
            roles = this.defaultRoles;
        }

        return Promise.resolve(roles);
    }

    public registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        this.addClient(clientId, this.defaultRoles);
        return Promise.resolve(this.defaultRoles);
    }

    public async verifyRolesAllowed(clientId: string, allowedRoles: UserMeetingRole[]): Promise<boolean> {
        LocalRoleVerifier.ensureWarned();

        if (!clientId) {
            throw new Error(`LocalRoleVerifier: called verifyRolesAllowed() without a clientId`);
        }

        if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
            const roles = await this.getClientRoles(clientId);
            for (let i = 0; i < allowedRoles.length; i++) {
                const role = allowedRoles[i];
                if (roles.indexOf(role) >= 0) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }

    private static _warned: boolean = false;

    private static ensureWarned(): void {
        if (!LocalRoleVerifier._warned) {
            console.warn(`The LocalRoleVerifier is being used. This should only be used for local testing purposes.`);
            LocalRoleVerifier._warned = true;
        }
    }
}
