/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveShareHost, UserMeetingRole, IClientInfo } from "../interfaces";
import { BaseHostDecorator } from "./BaseHostDecorator";
import { RequestCache } from "./RequestCache";
import {
    isErrorLike,
    isMobileWorkaroundRolesResponse,
    isClientRolesResponse,
} from "./type-guards";
import { waitForResult } from "./utils";

const EXPONENTIAL_BACKOFF_SCHEDULE = [100, 200, 200, 400, 600];
const CACHE_LIFETIME = 5 * 60 * 1000; // original cache time

/**
 * @hidden
 * Optionally Adds `retrySchedule` to `getClientInfo`. doesn't break `ILiveShareHost` interface.
 *
 * For internal use only. Will be deleted.
 */
export interface BackwardsCompatibilityGetClientInfoRetrySchedule {
    getClientInfo(
        clientId: string,
        lateFinish?: () => void,
        retrySchedule?: number[]
    ): Promise<IClientInfo | undefined>;
}

/**
 * @hidden
 * Decorator that provides backwards compatibility for getClientInfo
 * If getClientInfo does not exist on an unsupported client, `IUserInfo.displayName` will be undefined
 *
 * For internal use only. Will be deleted.
 */
export class BackwardsCompatibilityHostDecorator extends BaseHostDecorator {
    private readonly _userRolesRequestCache: RequestCache<UserMeetingRole[]> =
        new RequestCache(CACHE_LIFETIME);

    private _totalTries = 4;
    private _getClientInfoTriesRemaining = this._totalTries;
    private _getClientInfoExists = false;
    private _hasWarnedPolyfill = false;

    /**
     * @hidden
     * _host would be `BackwardsCompatibilityHostDecorator` decorator: `new BackwardsCompatibilityHostDecorator(new LiveShareHostDecorator(teamsJsHost))`
     */
    constructor(
        readonly _host: ILiveShareHost &
            BackwardsCompatibilityGetClientInfoRetrySchedule
    ) {
        super(_host);
        this.warmupCheckGetClientInfoExists();
    }

    /**
     * @deprecated
     */
    public async getClientRoles(
        clientId: string
    ): Promise<UserMeetingRole[] | undefined> {
        if (!clientId) {
            throw new Error(
                `BackwardsCompatibilityHostDecorator: called getClientInfo() without a clientId`
            );
        }
        return this._userRolesRequestCache.cacheRequest(clientId, () => {
            return waitForResult<UserMeetingRole[], unknown>(
                async () => {
                    return await this._host.getClientRoles(clientId);
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
                () => {
                    return new Error(
                        `BackwardsCompatibilityHostDecorator: timed out getting roles for a remote client ID`
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
            return await this._host.getClientInfo(clientId);
        }

        if (this._getClientInfoTriesRemaining <= 0) {
            if (!this._hasWarnedPolyfill) {
                console.warn(
                    "BackwardsCompatibilityHostDecorator.getClientInfo: using getClientInfo polyfill"
                );
                this._hasWarnedPolyfill = true;
            }
            const roles = await this.getClientRoles(clientId);
            return {
                userId: clientId,
                displayName: undefined,
                roles: roles ?? [],
            };
        }

        const getClientRoles = this.getClientRoles(clientId);
        try {
            const clientInfo = await this._host.getClientInfo(
                clientId,
                () => {
                    // The request initially timed out, but then it later was rejected/resolved for a legitimate reason
                    this._getClientInfoExists = true;
                },
                this.getRetrySchedule()
            );
            this._getClientInfoExists = true;
            return clientInfo;
        } catch (error: unknown) {
            if (isErrorLike(error) && error.message.includes("timed out")) {
                this._getClientInfoTriesRemaining--;
                if (this._getClientInfoTriesRemaining <= 0) {
                    console.warn(
                        "BackwardsCompatibilityHostDecorator.getClientInfo: will use getClientInfo polyfill"
                    );
                }

                const roles = await getClientRoles;
                return {
                    userId: clientId,
                    displayName: undefined,
                    roles: roles ?? [],
                };
            }
        }
        this._getClientInfoExists = true;
        // retry schedule gets longer as we lose confidence it exists.
        // First call to this._host.getClientInfo may result in an error if the api exists, but without retries.
        // If error we know the api exists. call the normal implementation again.
        // this should only ever be hit one time at the start because this._getClientInfoExists will be true.
        console.log(
            "BackwardsCompatibilityHostDecorator: error, retryingWithActual"
        );
        return await this.getClientInfo(clientId);
    }

    private warmupCheckGetClientInfoExists() {
        if (this._getClientInfoExists) return;

        // warmup doesn't use polyfill implementation
        // "fakeId" clientId, error expected, hopefully not a timeout
        this._host
            .getClientInfo(
                "fakeId",
                () => {
                    // The request initially timed out, but then it later was rejected/resolved for a legitimate reason
                    this._getClientInfoExists = true;
                },
                []
            )
            .catch((e) => {
                if (e.message.includes("timed out")) {
                    this._getClientInfoTriesRemaining--;
                    if (this._getClientInfoTriesRemaining > 0) {
                        this.warmupCheckGetClientInfoExists();
                    } else {
                        console.warn(
                            "BackwardsCompatibilityHostDecorator.getClientInfo: will use getClientInfo polyfill"
                        );
                    }
                } else {
                    // resolved for reason other than timeout, api exists
                    this._getClientInfoExists = true;
                }
            });
    }

    // retry little bit longer when getting to end of retries remaining.
    private getRetrySchedule(): number[] {
        const retryAmount =
            this._totalTries - Math.max(0, this._getClientInfoTriesRemaining);
        return EXPONENTIAL_BACKOFF_SCHEDULE.slice(0, retryAmount);
    }
}
