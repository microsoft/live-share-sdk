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

/**
 * Experiment for polyfil
 */
export class PolyfillHostDecorator implements ILiveShareHost {
    private readonly _userRolesRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);

    private _failedGetClientInfoCount = 0;

    /**
     * @hidden
     * _host would be normal decorator: PolyfillHostDecorator(LiveShareHostDecorator(teamsJsHost))
     */
    constructor(private readonly _host: ILiveShareHost) {}

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
        // fire getClientInfo and getClientRoles at same time.
        // if getClientInfo resolves, return that
        // if getClientInfo times out, return polyfil using getClientRoles, log warning
        // if getClientInfo times out after multiple calls, start using only polyfill.

        if (this._failedGetClientInfoCount > 5) {
            return this.getClientRoles(clientId).then((roles) => {
                return {
                    userId: clientId,
                    displayName: undefined,
                    roles: roles,
                } as IClientInfo;
            });
        }

        const getClientRoles = this.getClientRoles(clientId);
        return this._host.getClientInfo(clientId).catch((e) => {
            if (e.message.contains("timed out")) {
                console.log("using getClientInfo polyfill");
                this._failedGetClientInfoCount++;

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
}
