/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces";
import { TurboDataObject } from "./TurboDataObject";
import { ISharedMapEvents, SharedMap } from "fluid-framework";


export class TurboSharedMap extends TurboDataObject<
    ISharedMapEvents,
    SharedMap
> {
    constructor(dataObject: SharedMap) {
        const onDidOverrideDataObject = async () => {
            // this.emit("valueChanged", {}, false);
        };
        super(dataObject, ["valueChanged", "clear"], onDidOverrideDataObject);
    }

    /**
     * Get an iterator over the keys in this map.
     * @returns The iterator
     */
    public keys(): IterableIterator<string> {
        return this.dataObject.keys();
    }

    /**
     * Get an iterator over the entries in this map.
     * @returns The iterator
     */
    public entries(): IterableIterator<[string, any]> {
        return this.dataObject.entries();
    }

    /**
     * Get an iterator over the values in this map.
     * @returns The iterator
     */
    public values(): IterableIterator<any> {
        return this.dataObject.values();
    }

    /**
     * Get an iterator over the entries in this map.
     * @returns The iterator
     */
    public [Symbol.iterator](): IterableIterator<[string, any]> {
        return this.dataObject.entries();
    }

    /**
     * The number of key/value pairs stored in the map.
     */
    public get size() {
        return this.dataObject.size;
    }

    /**
     * Executes the given callback on each entry in the map.
     * @param callbackFn - Callback function
     */
    public forEach(callbackFn: (value: any, key: string, map: Map<string, any>) => void): void {
        this.dataObject.forEach(callbackFn);
    }

    /**
     * {@inheritDoc ISharedMap.get}
     */
    public get<T = any>(key: string): T | undefined {
        return this.dataObject.get<T>(key);
    }

    /**
     * Check if a key exists in the map.
     * @param key - The key to check
     * @returns True if the key exists, false otherwise
     */
    public has(key: string): boolean {
        return this.dataObject.has(key);
    }

    /**
     * {@inheritDoc ISharedMap.set}
     */
    public set(key: string, value: any): this {
        this.dataObject.set(key, value);
        return this;
    }

    /**
     * Delete a key from the map.
     * @param key - Key to delete
     * @returns True if the key existed and was deleted, false if it did not exist
     */
    public delete(key: string): boolean {
        return this.dataObject.delete(key);
    }

    /**
     * Clear all data from the map.
     */
    public clear(): void {
        return this.dataObject.clear();
    }

    public static async create(
        turboClient: IFluidTurboClient,
        objectKey: string,
        onDidFirstInitialize?: (dds: TurboSharedMap) => void
    ): Promise<TurboSharedMap> {
        const results = await turboClient.getDDS<
            ISharedMapEvents,
            SharedMap
        >(
            objectKey,
            SharedMap,
            (dds: IFluidLoadable): TurboSharedMap => {
                return new TurboSharedMap(dds as SharedMap);
            }
        );
        const dds = results.dds as TurboSharedMap;
        if (results.created) {
            onDidFirstInitialize?.(dds);
        }
        return dds;
    }
}
