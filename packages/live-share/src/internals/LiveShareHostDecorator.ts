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
const CACHE_LIFETIME = 10 * 1000;

/**
 * Live Share Host decorator used to reduce rapid duplicate requests.
 */
export class LiveShareHostDecorator implements ILiveShareHost {
    private readonly _registerRequestCache: RequestCache<void> =
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

    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        if (!clientId) {
            throw new Error(
                `ClientManager: called getClientInfo() without a clientId`
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
                        `ClientManager: timed out getting client info for a remote client ID`
                    );
                },
                EXPONENTIAL_BACKOFF_SCHEDULE
            );
        });
    }

    public async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        return this._registerRequestCache
            .cacheRequest(clientId, () => {
                return waitForResult(
                    async () => {
                        await this._host.registerClientId(clientId);
                    },
                    (_) => {
                        // we only care that it was successful
                        return true;
                    },
                    () => {
                        return new Error(
                            `LiveShareHostWrapper: timed out registering local client ID`
                        );
                    },
                    EXPONENTIAL_BACKOFF_SCHEDULE
                );
            })
            .then((_) => this.getClientInfo(clientId))
            .then((userInfo) => userInfo?.roles ?? []);
    }
}
