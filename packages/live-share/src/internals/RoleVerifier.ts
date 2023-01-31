/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveShareHost, IRoleVerifier, UserMeetingRole } from "../interfaces";
import { waitForResult } from "./utils";
import { RequestCache } from "./RequestCache";

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];
// 5 minutes
// const CACHE_LIFETIME = 5 * 60 * 1000;
const CACHE_LIFETIME = 1 * 60 * 1000;

/**
 * @hidden
 */
export class RoleVerifier implements IRoleVerifier {
    private readonly _registerRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);
    private readonly _getRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);

    public constructor(private readonly _host: ILiveShareHost) {}

    public async registerClientId(
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
                        //TODO: Mobile client return type is object.
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

    public async getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        if (!clientId) {
            throw new Error(
                `RoleVerifier: called getCLientRoles() without a clientId`
            );
        }

        // Check for local client ID
        // - For the local client we want to short circuit any network calls and just use the
        //   cached value from the registerClientId() call.
        if (this._registerRequestCache.has(clientId)) {
            return await this.registerClientId(clientId);
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
                        //TODO: Mobile client return type is object.
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
}
