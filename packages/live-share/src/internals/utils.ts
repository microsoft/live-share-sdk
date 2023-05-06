/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITokenProvider } from "@fluidframework/azure-client";

/**
 * @hidden
 */
export function cloneValue<T>(value: T | undefined): T | undefined {
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
export function waitForResult<TResult>(
    fnRequest: () => Promise<TResult | undefined>,
    fnSucceeded: (result: TResult | undefined) => boolean,
    fnTimeout: () => Error,
    retrySchedule: number[]
): Promise<TResult> {
    let retries: number = 0;
    return new Promise<TResult>(async (resolve, reject) => {
        while (true) {
            const result = await timeoutRequest(
                fnRequest,
                1000 * (retries + 1)
            );
            if (fnSucceeded(result)) {
                resolve(result!);
                break;
            } else if (retries >= retrySchedule.length) {
                reject(fnTimeout());
                break;
            } else {
                await waitForDelay(retrySchedule[retries++]);
            }
        }
    });
}

/**
 * BUGBUG: Workaround for Teams Client not rejecting errors :(
 * @hidden
 */
function timeoutRequest<TResult>(
    fnRequest: () => Promise<TResult | undefined>,
    timeout: number
): Promise<TResult | undefined> {
    return new Promise<TResult | undefined>(async (resolve) => {
        const hTimer = setTimeout(() => {
            resolve(undefined);
        }, timeout);
        const result = await fnRequest();
        clearTimeout(hTimer);
        resolve(result);
    });
}

/**
 * Dynamically import InsecureTokenProvider class, in case developer does not yet have "@fluidframework/test-client-utils",
 * since don't want to require that they include it in package.json.
 * @hidden
 */
export async function getInsecureTokenProvider(): Promise<ITokenProvider> {
    try {
        const { InsecureTokenProvider } = await require("@fluidframework/test-client-utils");
        const tokenProvider = new InsecureTokenProvider("", {
            id: "123",
            name: "Test User",
        });
        return tokenProvider as ITokenProvider;
    } catch {
        throw new Error("@microsoft/live-share: when using 'local' connection type, you must have @fluidframework/test-client-utils installed");
    }
}
