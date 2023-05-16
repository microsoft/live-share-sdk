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
import { BackwardsCompatibilityGetClientInfoRetrySchedule } from "./BackwardsCompatibilityHostDecorator";
import { RequestCache } from "./RequestCache";
import {
    isErrorLike,
    isIClientInfo,
    isMobileWorkaroundRolesResponse,
    isClientRolesResponse,
} from "./type-guards";
import { waitForResult } from "./utils";

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];
const CACHE_LIFETIME = 4 * 1000;

/**
 * @hidden
 * Live Share Host decorator used to reduce rapid duplicate requests.
 */
export class LiveShareHostDecorator
    implements ILiveShareHost, BackwardsCompatibilityGetClientInfoRetrySchedule
{
    private readonly _registerRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);
    private readonly _userInfoRequestCache: RequestCache<
        IClientInfo | undefined
    > = new RequestCache(CACHE_LIFETIME);

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
        lateFinish?: () => void, // TODO: delete this and below (not a breaking change to remove, see InternalDontUseGetClientInfoRetryPolyfill)
        retrySchedule?: number[]
    ): Promise<IClientInfo | undefined> {
        if (!clientId) {
            throw new Error(
                `LiveShareHostDecorator: called getClientInfo() without a clientId`
            );
        }
        return this._userInfoRequestCache.cacheRequest(clientId, () => {
            return waitForResult<
                IClientInfo | undefined,
                IClientInfo | undefined
            >(
                async () => {
                    return await this._host.getClientInfo(clientId);
                },
                (result) => {
                    if (isIClientInfo(result)) {
                        return {
                            response: result,
                        };
                    }
                    return null;
                },
                (error: unknown) => {
                    return new Error(
                        `LiveShareHostDecorator: getting client info for a remote client ID for reason: ${
                            isErrorLike(error) ? error.message : "unknown"
                        }`
                    );
                },
                retrySchedule ?? EXPONENTIAL_BACKOFF_SCHEDULE,
                (error: unknown) => {
                    // Errors here do not include any timeout errors, so if it is an error from "fakeId", we immediately reject it
                    if (clientId === "fakeId") {
                        return new Error(
                            isErrorLike(error)
                                ? error.message
                                : "an unknown error occurred"
                        );
                    }
                    return null;
                },
                lateFinish // TODO: delete (not a breaking change to remove, see InternalDontUseGetClientInfoRetryPolyfill)
            );
        });
    }

    public async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        return this._registerRequestCache.cacheRequest(clientId, () => {
            return waitForResult<UserMeetingRole[], unknown>(
                async () => {
                    return await this._host.registerClientId(clientId);
                },
                (result) => {
                    if (isClientRolesResponse(result)) {
                        return {
                            response: result,
                        };
                    } else if (isMobileWorkaroundRolesResponse(result)) {
                        return {
                            response: result.userRoles,
                        };
                    }
                    return null;
                },
                (reason: unknown) => {
                    return new Error(
                        `LiveShareHostDecorator: registering local client ID for reason: ${
                            isErrorLike(reason) ? reason.message : "unknown"
                        }`
                    );
                },
                EXPONENTIAL_BACKOFF_SCHEDULE
            );
        });
    }
}
