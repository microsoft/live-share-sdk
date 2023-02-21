import { useCallback, useEffect } from "react";

/**
 * Debounce a function to prevent it from being called too often
 * 
 * @param fn function to debounce
 * @param ms delay in milliseconds
 * @returns tuple with debounced function and teardown function to cancel the timeout
 */
export function debounce<R = void>(
    fn: (...args: any[]) => R,
    ms: number
): [(...args: any[]) => Promise<R>, () => void] {
    let timer: NodeJS.Timeout;

    const debouncedFunc = (...args: any[]): Promise<R> =>
        new Promise((resolve) => {
            if (timer) {
                clearTimeout(timer);
            }

            timer = setTimeout(() => {
                resolve(fn(args));
            }, ms);
        });

    const teardown = () => clearTimeout(timer);

    return [debouncedFunc, teardown];
}

/**
 * React hook for debouncing a function
 * 
 * @param fn function to debounce
 * @param ms delay in milliseconds
 * @returns debounced function wrapped in React useCallback
 */
export const useDebounce = <R = void>(
    fn: (...args: any[]) => R,
    ms: number
): ((...args: any[]) => Promise<R>) => {
    const [debouncedFun, teardown] = debounce<R>(fn, ms);

    /// When the component unmounts, cancel the timeout
    useEffect(() => () => teardown(), [fn, ms]);

    return useCallback(debouncedFun, [fn, ms]);
};
