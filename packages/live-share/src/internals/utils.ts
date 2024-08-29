/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITokenProvider } from "@fluidframework/azure-client";
import { v4 as uuid } from "uuid";
import { IRuntimeSignaler } from "./LiveEventScope.js";
import { IClientTimestamp } from "../interfaces.js";

/**
 * @hidden
 */
export function cloneValue<T>(value: T): T {
    return typeof value == "object" ? JSON.parse(JSON.stringify(value)) : value;
}

/**
 * @hidden
 */
export function decodeBase64(data: string): string {
    if (typeof atob == "function") {
        return atob(data);
    } else {
        return Buffer.from(data, "base64").toString();
    }
}

/**
 * @hidden
 */
export const parseJwt = (token: string) => {
    try {
        return JSON.parse(decodeBase64(token.split(".")[1]));
    } catch (e) {
        return null;
    }
};

/**
 * @hidden
 */
export function waitForDelay(delay: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), delay);
    });
}

/**
 * @hidden
 */
export class TimeoutError extends Error {
    constructor() {
        super("timed out");
    }
}

/**
 * @hidden
 */
export function waitForResult<TSuccessResult, TRequestResult>(
    fnRequest: () => Promise<TRequestResult>,
    fnValidateResponse: (result: TRequestResult) => {
        response: TSuccessResult;
    } | null,
    retrySchedule: number[],
    basedDelayMilliseconds: number = 1000
): Promise<TSuccessResult> {
    let retries: number = 0;
    return new Promise<TSuccessResult>(async (resolve, reject) => {
        while (true) {
            try {
                const result = await timeoutRequest(
                    fnRequest,
                    Math.max(
                        basedDelayMilliseconds * (retries + 1),
                        basedDelayMilliseconds * 3
                    )
                );
                const validated = fnValidateResponse(result);
                if (validated !== null) {
                    resolve(validated.response);
                    break;
                } else if (retries >= retrySchedule.length) {
                    reject(new Error("waitForResult: invalid response"));
                    break;
                }
            } catch (error: unknown) {
                if (retries >= retrySchedule.length) {
                    reject(error);
                    break;
                }
            }

            await waitForDelay(retrySchedule[retries++]);
        }
    });
}

/**
 * BUGBUG: Workaround for Teams Client not rejecting errors :(
 * @hidden
 */
export function timeoutRequest<TResult>(
    fnRequest: () => Promise<TResult>,
    timeout: number
): Promise<TResult> {
    return new Promise<TResult>(async (resolve, reject) => {
        let hTimer: any = setTimeout(() => {
            reject(new TimeoutError());
            hTimer = null;
        }, timeout);
        try {
            const result = await fnRequest();
            resolve(result);
        } catch (error: unknown) {
            reject(error);
        }
        clearTimeout(hTimer);
    });
}

/**
 * Dynamically import InsecureTokenProvider class, in case developer does not yet have "@fluidframework/test-runtime-utils",
 * since don't want to require that they include it in package.json.
 * @hidden
 */
export async function getInsecureTokenProvider(): Promise<ITokenProvider> {
    const userId: () => string | undefined | null = () => {
        try {
            const userIdParam = new URL(
                window.location.href
            )?.searchParams?.get("userId");
            return userIdParam;
        } catch {
            // window not available
            return undefined;
        }
    };
    try {
        const { InsecureTokenProvider } = await import(
            "@fluidframework/test-runtime-utils/internal"
        );
        const tokenProvider = new InsecureTokenProvider("", {
            id: userId() ?? uuid(),
            name: "Test User",
        });
        return tokenProvider as ITokenProvider;
    } catch {
        throw new Error(
            "@microsoft/live-share: when using 'local' connection type, you must have @fluidframework/test-runtime-utils installed"
        );
    }
}

/**
 * @hidden
 * Waits until connected and gets the most recent clientId
 * @returns clientId
 */
export function waitUntilConnected(runtime: IRuntimeSignaler): Promise<string> {
    return new Promise((resolve) => {
        const onConnected = (clientId: string) => {
            runtime.off("connected", onConnected);
            resolve(clientId);
        };

        if (runtime.clientId) {
            resolve(runtime.clientId);
        } else {
            runtime.on("connected", onConnected);
        }
    });
}

/**
 * @hidden
 * Returns true if a received event is newer then the current event.
 *
 * @remarks
 * Used when building new Live objects to process state change events. The `isNewer()`
 * method implements an algorithm that deals with conflicting events that have the same timestamp
 * and older events that should have debounced the current event.
 *
 * - When the received event has the same timestamp as the current event, each events clientId
 *   will be used as a tie breaker. The clientId containing the lower sort order wins any ties.
 * - Older events are generally ignored unless a debounce period is specified. An older event
 *   that should have debounced the current event will be considered newer.
 *
 * The algorithm employed by isNewer() helps ensure that all clients will eventually reach a
 * consistent state with one other.
 * @param current Current event to compare received event against.
 * @param received Received event.
 * @param debouncePeriod Optional. Time in milliseconds to ignore any new events for. Defaults to 0 ms.
 * @returns True if the received event is newer then the current event and should replace the current one.
 */
export function isNewerEvent(
    current: IClientTimestamp | undefined,
    received: IClientTimestamp,
    debouncePeriod = 0
): boolean {
    if (current) {
        if (current.timestamp == received.timestamp) {
            // In a case where both clientId's are blank that's the local client in a disconnected state
            const cmp = (current.clientId || "").localeCompare(
                received.clientId || ""
            );
            if (cmp <= 0) {
                // - cmp == 0 is same user. We use to identify events for same user as newer but
                //   that was causing us to fire duplicate state & presence change events. The better
                //   approach is to update the timestamp provider to never return the same timestamp
                //   twice.  (Comparison was changed on 8/2/2022)
                // - cmp > 0 is a tie breaker so we'll take that event as well (comparing 'a' with 'c'
                //   will result in a negative value).
                return false;
            }
        } else if (current.timestamp > received.timestamp) {
            // Did we receive an older event that should have caused us to debounce the current one?
            const delta = current.timestamp - received.timestamp;
            if (delta > debouncePeriod) {
                return false;
            }
        } else {
            // Is the new event within the debounce period?
            const delta = received.timestamp - current.timestamp;
            if (delta < debouncePeriod) {
                return false;
            }
        }
    }

    return true;
}
