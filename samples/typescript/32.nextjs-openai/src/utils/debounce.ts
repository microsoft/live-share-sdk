import { useCallback, useEffect } from "react";

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


export const useDebounce = <R = void>(
    fn: (...args: any[]) => R,
    ms: number
): ((...args: any[]) => Promise<R>) => {
    const [debouncedFun, teardown] = debounce<R>(fn, ms);

    useEffect(() => () => teardown(), [fn, ms]);

    return useCallback(debouncedFun, [fn, ms]);
};
