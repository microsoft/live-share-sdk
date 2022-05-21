/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export function cloneValue<T>(value: T|undefined): T|undefined {
    return typeof value == 'object' ? JSON.parse(JSON.stringify(value)) : value;
}

export function decodeBase64(data: string): string {
    if (typeof atob == 'function') {
        return atob(data);
    } else {
        return Buffer.from(data, 'base64').toString();
    }
}


export const parseJwt = (token: string) => {
    try {
      return JSON.parse(decodeBase64(token.split(".")[1]));
    } catch (e) {
      return null;
    }
}

export function waitForDelay(delay: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), delay);
    });
}

export function waitForResult<TResult>(
    fnRequest: () => Promise<TResult|undefined>, 
    fnSucceeded: (result: TResult|undefined) => boolean,
    fnTimeout: () => Error,
    retrySchedule: number[]
): Promise<TResult> {
    let retries: number = 0;
    return new Promise<TResult>(async (resolve, reject) => {
        while (true) {
            const result = await fnRequest();
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
