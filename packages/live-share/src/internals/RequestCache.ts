/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

/**
 * @hidden
 */
export class RequestCache<TResult = any> {
    private readonly _cache = new Map<string, RequestCacheEntry<TResult>>();
    private readonly _cacheLifetime: number;

    constructor(cacheLifetime: number) {
        this._cacheLifetime = cacheLifetime;
    }

    public cacheRequest(
        key: string,
        fnRequest: () => Promise<TResult>
    ): Promise<TResult> {
        const startTime = new Date().getTime();
        let entry: RequestCacheEntry<TResult>;
        if (this._cache.has(key)) {
            entry = this._cache.get(key)!;
            const expiresAt = entry.startTime + this._cacheLifetime;
            if (startTime < expiresAt) {
                // Cache entry is valid so return cached promise
                return entry.promise;
            }
        }

        // Make new request and cache promise
        const promise = fnRequest();
        this._cache.set(key, { startTime, promise });
        return promise;
    }

    public has(key: string): boolean {
        return this._cache.has(key);
    }
}

/**
 * @hidden
 */
interface RequestCacheEntry<TResult> {
    startTime: number;
    promise: Promise<TResult>;
}
