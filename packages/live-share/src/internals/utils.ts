/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
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
