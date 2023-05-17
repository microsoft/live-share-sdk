/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITokenProvider } from "@fluidframework/azure-client";
import { v4 as uuid } from "uuid";
import { IRuntimeSignaler } from "../LiveEventScope";

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
    fnTimeout: (reason: unknown) => Error,
    retrySchedule: number[],
    fnRequestError?: (error: unknown) => Error | null,
    lateFinish?: () => void,
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
                    ),
                    lateFinish
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
                    reject(fnTimeout(error));
                    break;
                }
                // Check if this error is something that should cause us to skip the retry schedule
                if (!!fnRequestError && !(error instanceof TimeoutError)) {
                    const rejectNowError = fnRequestError(error);
                    if (rejectNowError !== null) {
                        reject(rejectNowError);
                        break;
                    }
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
    timeout: number,
    lateFinish?: () => void
): Promise<TResult> {
    return new Promise<TResult>(async (resolve, reject) => {
        let hTimer: NodeJS.Timeout | null = setTimeout(() => {
            reject(new TimeoutError());
            hTimer = null;
        }, timeout);
        try {
            const result = await fnRequest();
            resolve(result);
            if (hTimer == null) {
                lateFinish?.();
            }
        } catch (error: unknown) {
            reject(error);
            if (hTimer == null) {
                lateFinish?.();
            }
        }
        clearTimeout(hTimer);
    });
}

/**
 * Dynamically import InsecureTokenProvider class, in case developer does not yet have "@fluidframework/test-client-utils",
 * since don't want to require that they include it in package.json.
 * @hidden
 */
export async function getInsecureTokenProvider(): Promise<ITokenProvider> {
    try {
        const { InsecureTokenProvider } =
            await require("@fluidframework/test-client-utils");
        const userIdParam = new URL(window.location.href)?.searchParams?.get(
            "userId"
        );
        const tokenProvider = new InsecureTokenProvider("", {
            id: userIdParam ?? uuid(),
            name: "Test User",
        });
        return tokenProvider as ITokenProvider;
    } catch {
        throw new Error(
            "@microsoft/live-share: when using 'local' connection type, you must have @fluidframework/test-client-utils installed"
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
