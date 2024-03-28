/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export function debounce<R = void>(
    fn: (...args: any[]) => R,
    ms: number
): [(...args: any[]) => Promise<R>, () => void] {
    let timer: any;

    const debouncedFunc = (...args: any[]): Promise<R> =>
        new Promise((resolve) => {
            if (timer) {
                clearTimeout(timer);
            }

            timer = setTimeout(() => {
                resolve(fn(args));
            }, ms);
        });

    const teardown = () => timer && clearTimeout(timer);

    return [debouncedFunc, teardown];
}
