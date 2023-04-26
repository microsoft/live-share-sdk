/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ILiveShareHost,
    IFluidTenantInfo,
    IFluidContainerInfo,
    INtpTimeInfo,
    UserMeetingRole,
    IClientInfo,
} from "../interfaces";
import { RequestCache } from "./RequestCache";
import { waitForResult } from "./utils";

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];
const CACHE_LIFETIME = 5 * 60 * 1000; // original cache time

export interface InternalDontUseGetClientInfoRetryPolyfill {
    /**
     * Adds retry schedule optionally. doesn't break ILiveShareHost interface.
     *
     * For internal use only.
     */
    getClientInfo(
        clientId: string,
        retrySchedule?: number[]
    ): Promise<IClientInfo | undefined>;
}

/**
 * Experiment for polyfil
 */
export class PolyfillHostDecorator implements ILiveShareHost {
    private readonly _userRolesRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);

    private _getClientInfoTriesRemaining = 2;
    private _getClientInfoExists = false;

    /**
     * @hidden
     * _host would be `LiveShareHostDecorator` decorator: `new PolyfillHostDecorator(new LiveShareHostDecorator(teamsJsHost))`
     */
    constructor(
        private readonly _host: ILiveShareHost &
            InternalDontUseGetClientInfoRetryPolyfill
    ) {
        this.warmupPolyfillCheck();
    }

    public getFluidTenantInfo(): Promise<IFluidTenantInfo> {
        return this._host.getFluidTenantInfo();
    }

    public getFluidToken(containerId?: string): Promise<string> {
        return this._host.getFluidToken(containerId);
    }

    public getFluidContainerId(): Promise<IFluidContainerInfo> {
        return this._host.getFluidContainerId();
    }

    public setFluidContainerId(
        containerId: string
    ): Promise<IFluidContainerInfo> {
        return this._host.setFluidContainerId(containerId);
    }

    public getNtpTime(): Promise<INtpTimeInfo> {
        return this._host.getNtpTime();
    }

    /**
     * @deprecated
     */
    public async getClientRoles(
        clientId: string
    ): Promise<UserMeetingRole[] | undefined> {
        if (!clientId) {
            throw new Error(
                `LiveShareHostDecorator: called getClientInfo() without a clientId`
            );
        }
        return this._userRolesRequestCache.cacheRequest(clientId, () => {
            return waitForResult(
                async () => {
                    let rolesResult: UserMeetingRole[] | undefined;
                    try {
                        rolesResult = await this._host.getClientRoles(clientId);
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
                        `LiveShareHostDecorator: timed out getting roles for a remote client ID`
                    );
                },
                EXPONENTIAL_BACKOFF_SCHEDULE
            );
        });
    }

    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        // 1. fire getClientInfo and getClientRoles at same time.
        //    - on new versions of teams client getClientInfo and getClientRoles share same network cache, cheap to call.
        //    - on old versions of teams client getClientRoles needs to be called anyway.

        // 2. if getClientInfo resolves, return that
        // 3. if getClientInfo times out, return polyfil using getClientRoles, log warning
        // 4. if getClientInfo times out after multiple calls, start using only polyfill.

        if (this._getClientInfoExists) {
            return this._host.getClientInfo(clientId);
        }

        if (this._getClientInfoTriesRemaining <= 0) {
            console.log("using getClientInfo polyfill");
            return this.getClientRoles(clientId).then((roles) => {
                return {
                    userId: clientId,
                    displayName: undefined,
                    roles: roles,
                } as IClientInfo;
            });
        }

        const getClientRoles = this.getClientRoles(clientId);
        return this._host
            .getClientInfo(clientId, [200])
            .then((clientInfo) => {
                this._getClientInfoExists = true;
                return clientInfo;
            })
            .catch((e) => {
                if (e.message.includes("timed out")) {
                    console.log("using getClientInfo polyfill");
                    this._getClientInfoTriesRemaining--;

                    return getClientRoles.then((roles) => {
                        return {
                            userId: clientId,
                            displayName: undefined,
                            roles: roles,
                        } as IClientInfo;
                    });
                } else {
                    return Promise.resolve(undefined);
                }
            });
    }

    public async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        return this._host.registerClientId(clientId);
    }

    private warmupPolyfillCheck() {
        // warmup doesn't use polyfill implementation
        // "blah" clientId, error expected, hopefully not a timeout
        this._host.getClientInfo("blah", [200]).catch((e) => {
            if (e.message.includes("timed out")) {
                this._getClientInfoTriesRemaining--;
                if (this._getClientInfoTriesRemaining > 0) {
                    this.warmupPolyfillCheck();
                }
            } else {
                // resolved for reason other than timeout, api exists
                this._getClientInfoExists = true;
            }
        });
    }
}
