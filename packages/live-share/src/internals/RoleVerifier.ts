/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveShareHost, IRoleVerifier, UserMeetingRole } from "../interfaces";
import { waitForResult } from "./utils";
import { RequestCache } from "./RequestCache";

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];
const CACHE_LIFETIME = 10 * 1000;
/**
 * @hidden
 */
export class RoleVerifier implements IRoleVerifier {
    private readonly _registerRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);
    private readonly _getRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);

    public constructor(private readonly _host: ILiveShareHost) {}

    public async getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        if (!clientId) {
            throw new Error(
                `RoleVerifier: called getClientRoles() without a clientId`
            );
        }

        return this._getRequestCache.cacheRequest(clientId, () => {
            return waitForResult(
                async () => {
                    let rolesResult: UserMeetingRole[] | undefined;
                    try {
                        const info = await this._host.getClientInfo(clientId);
                        console.log("info", info);
                        rolesResult = info?.roles;
                    } catch (error) {
                        // Error is thrown when client id is not registered
                        // Assume Client Id is local and to be newly registered.
                        // Our service is first writer wins, so we will not overwrite
                        // if previous states exist.
                        console.warn(
                            "getClientRolesError: " + JSON.stringify(error)
                        );
                        return await this.registerClientId(clientId);
                    }
                    if (!rolesResult) {
                        return undefined;
                    } else if (Array.isArray(rolesResult)) {
                        return rolesResult;
                    } else {
                        // TODO: Mobile client return type is object.
                        // clean up after mobile fixes return type.
                        const rolesArray = (rolesResult as any).userRoles;
                        if (!rolesArray) {
                            return rolesResult;
                        } else {
                            return rolesArray;
                        }
                    }
                },
                (result) => {
                    if (!result) {
                        return false;
                    } else if (Array.isArray(result)) {
                        return true;
                    } else if (!result.userRoles) {
                        return false;
                    } else {
                        return Array.isArray(result.userRoles);
                    }
                },
                () => {
                    return new Error(
                        `RoleVerifier: timed out getting roles for a remote client ID`
                    );
                },
                EXPONENTIAL_BACKOFF_SCHEDULE
            );
        });
    }

    public async verifyRolesAllowed(
        clientId: string,
        allowedRoles: UserMeetingRole[]
    ): Promise<boolean> {
        if (!clientId) {
            throw new Error(
                `RoleVerifier: called verifyRolesAllowed() without a clientId`
            );
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

    private async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        return this._registerRequestCache.cacheRequest(clientId, () => {
            return waitForResult(
                async () => {
                    const rolesResult = await this._host.registerClientId(
                        clientId
                    );
                    if (!rolesResult) {
                        return undefined;
                    } else if (Array.isArray(rolesResult)) {
                        return rolesResult;
                    } else {
                        // TODO: Mobile client return type is object.
                        // clean up after mobile fixes return type.
                        const rolesArray = (rolesResult as any).userRoles;
                        if (!rolesArray) {
                            return rolesResult;
                        } else {
                            return rolesArray;
                        }
                    }
                },
                (result) => {
                    if (!result) {
                        return false;
                    } else if (Array.isArray(result)) {
                        return true;
                    } else if (!result.userRoles) {
                        return false;
                    } else {
                        return Array.isArray(result.userRoles);
                    }
                },
                () => {
                    return new Error(
                        `RoleVerifier: timed out registering local client ID`
                    );
                },
                EXPONENTIAL_BACKOFF_SCHEDULE
            );
        });
    }
}
