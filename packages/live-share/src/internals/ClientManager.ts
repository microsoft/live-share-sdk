/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IClientInfo, ILiveShareHost } from "../interfaces";
import { waitForResult } from "./utils";
import { RequestCache } from "./RequestCache";

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];
const CACHE_LIFETIME = 10 * 1000;
/**
 * @hidden
 */
export class ClientManager {
    private readonly _registerRequestCache: RequestCache<void> =
        new RequestCache(CACHE_LIFETIME);
    private readonly _getRequestCache: RequestCache<IClientInfo> =
        new RequestCache(CACHE_LIFETIME);

    public constructor(private readonly _host: ILiveShareHost) {}

    public async getClientInfo(clientId: string): Promise<IClientInfo> {
        if (!clientId) {
            throw new Error(
                `RoleVerifier: called getClientRoles() without a clientId`
            );
        }

        return this._getRequestCache.cacheRequest(clientId, () => {
            return waitForResult(
                async () => {
                    try {
                        return await this._host.getClientInfo(clientId);
                    } catch (error) {
                        // Error is thrown when client id is not registered
                        // Assume Client Id is local and to be newly registered.
                        // Our service is first writer wins, so we will not overwrite
                        // if previous states exist.
                        console.warn(
                            "getClientRolesError: " + JSON.stringify(error)
                        );
                        await this.registerClientId(clientId);
                        return await this._host.getClientInfo(clientId);
                    }
                },
                (result) => {
                    return result?.userId != undefined;
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

    public async registerClientId(clientId: string): Promise<void> {
        return this._registerRequestCache.cacheRequest(clientId, () => {
            return waitForResult(
                async () => {
                    await this._host.registerClientId(clientId);
                },
                (result) => {
                    return true;
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
