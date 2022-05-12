/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IRoleVerifier, UserMeetingRole } from '../interfaces';
import { TeamsClientApi, TestTeamsClientApi } from './TestTeamsClientApi';
import { waitForDelay } from './utils';

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];


export class RoleVerifier implements IRoleVerifier {
    private _teamsClient?: TeamsClientApi;
    private readonly roleCache: Map<string, UserMeetingRole[]> = new Map();

    public async registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        if (!this.roleCache.has(clientId)) {
            // Initialize cache with empty entry
            // - This guards against re-entry while registering client
            this.roleCache.set(clientId, []);
            try {
                const teamsClient = await this.getTeamsClient();
                const roles = await teamsClient.interactive.registerClientId(clientId);
                this.roleCache.set(clientId, roles);
                return roles;
            } catch (err) {
                this.roleCache.delete(clientId);
                throw err;
            }
        } else {
            return this.roleCache.get(clientId)!;
        }
    }

    public async getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        // Fetch client roles on first access
        if (!this.roleCache.has(clientId)) {
            const teamsClient = await this.getTeamsClient();

            let tries = 0;
            while (true) {
                const roles = await teamsClient.interactive.getClientRoles(clientId);
                if (roles) {
                    this.roleCache.set(clientId, roles);
                    break;
                } else if (tries < EXPONENTIAL_BACKOFF_SCHEDULE.length) {
                    await waitForDelay(EXPONENTIAL_BACKOFF_SCHEDULE[tries++]);
                } else {
                    throw new Error(`RoleVerifier: timeout verifying role for a client.`);
                }
            }
        }

        return this.roleCache.get(clientId)!;
    }
    
    public async verifyRolesAllowed(clientId: string, allowedRoles: UserMeetingRole[]): Promise<boolean> {
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

    private async getTeamsClient(): Promise<TeamsClientApi> {
        if (!this._teamsClient) {
            if (window) {
                this._teamsClient = await import('@microsoft/teams-js');
            } else {
                this._teamsClient = new TestTeamsClientApi();
            }
        }

        return this._teamsClient;
    } 
}
