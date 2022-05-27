/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IRoleVerifier, UserMeetingRole } from '../interfaces';
import { TeamsClientApi, TestTeamsClientApi } from './TestTeamsClientApi';
import {  waitForResult } from './utils';
import { RequestCache } from './RequestCache';

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];
const CACHE_LIFETIME = 60 * 60 * 1000;


/**
 * @hidden
 */
export class RoleVerifier implements IRoleVerifier {
    private _teamsClient?: TeamsClientApi;
    private readonly _registerRequestCache: RequestCache<UserMeetingRole[]> = new RequestCache(CACHE_LIFETIME);
    private readonly _getRequestCache: RequestCache<UserMeetingRole[]> = new RequestCache(CACHE_LIFETIME);

    public async registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        return this._registerRequestCache.cacheRequest(clientId, () => {
            return waitForResult(async () => {
                const teamsClient = await this.getTeamsClient();
                return await teamsClient.interactive.registerClientId(clientId);
            }, (result) => {
                return Array.isArray(result);
            }, () => {
                return new Error(`RoleVerifier: timed out registering local client ID`);
            }, EXPONENTIAL_BACKOFF_SCHEDULE);
        });
    }

    public async getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        if (!clientId) {
            throw new Error(`RoleVerifier: called getCLientRoles() without a clientId`);
        }

        // Check for local client ID
        // - For the local client we want to short circuit any network calls and just use the
        //   cached value from the registerClientId() call. 
        if (this._registerRequestCache.has(clientId)) {
            return await this.registerClientId(clientId);
        }

        return this._getRequestCache.cacheRequest(clientId, () => {
            return waitForResult(async () => {
                const teamsClient = await this.getTeamsClient();
                return await teamsClient.interactive.getClientRoles(clientId);
            }, (result) => {
                return Array.isArray(result);
            }, () => {
                return new Error(`RoleVerifier: timed out getting roles for a remote client ID`);
            }, EXPONENTIAL_BACKOFF_SCHEDULE);
        });
    }

    public async verifyRolesAllowed(clientId: string, allowedRoles: UserMeetingRole[]): Promise<boolean> {
        if (!clientId) {
            throw new Error(`RoleVerifier: called verifyRolesAllowed() without a clientId`);
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

    private async getTeamsClient(): Promise<TeamsClientApi> {
        if (!this._teamsClient) {
            if (window) {
                this._teamsClient = (await import('@microsoft/teams-js') as any) as TeamsClientApi;
            } else {
                this._teamsClient = new TestTeamsClientApi();
            }
        }

        return this._teamsClient;
    }
}
