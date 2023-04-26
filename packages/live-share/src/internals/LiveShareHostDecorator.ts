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
import { InternalDontUseGetClientInfoRetryPolyfill } from "./PolyfillHostDecorator";
import { RequestCache } from "./RequestCache";
import { waitForResult } from "./utils";

const EXPONENTIAL_BACKOFF_SCHEDULE = [200, 400, 400, 800, 1200];
const CACHE_LIFETIME = 4 * 1000;

/**
 * Live Share Host decorator used to reduce rapid duplicate requests.
 */
export class LiveShareHostDecorator
    implements ILiveShareHost, InternalDontUseGetClientInfoRetryPolyfill
{
    private readonly _registerRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);
    private readonly _userInfoRequestCache: RequestCache<IClientInfo> =
        new RequestCache(CACHE_LIFETIME);

    /**
     * @hidden
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
        return this._host.getClientRoles(clientId);
    }

    public async getClientInfo(
        clientId: string,
        retrySchedule?: number[] // TODO: delete (not a breaking change to remove, see InternalDontUseGetClientInfoRetryPolyfill)
    ): Promise<IClientInfo | undefined> {
        if (!clientId) {
            throw new Error(
                `LiveShareHostDecorator: called getClientInfo() without a clientId`
            );
        }
        return this._userInfoRequestCache.cacheRequest(clientId, () => {
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
                            "getClientInfoError: " + JSON.stringify(error)
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
                        `LiveShareHostDecorator: timed out getting client info for a remote client ID`
                    );
                },
                retrySchedule ?? EXPONENTIAL_BACKOFF_SCHEDULE
            );
        });
    }

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
                        `LiveShareHostDecorator: timed out registering local client ID`
                    );
                },
                EXPONENTIAL_BACKOFF_SCHEDULE
            );
        });
    }
}
