/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    DataObjectFactory,
    createDataObjectKind,
} from "@fluidframework/aqueduct/internal";
import {
    FluidObject,
    IFluidContainer,
    SharedObjectKind,
} from "fluid-framework";
import { IFluidHandle, IFluidLoadable } from "@fluidframework/core-interfaces";
import { assert } from "@fluidframework/core-utils/internal";
import { ConsensusRegisterCollection } from "@fluidframework/register-collection/internal";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";
import { LiveDataObject } from "./LiveDataObject";

// Register ConsensusRegisterCollection
DynamicObjectRegistry.registerObjectClass(
    ConsensusRegisterCollection,
    ConsensusRegisterCollection.getFactory().type
);

type DynamicObjectsCollection = ConsensusRegisterCollection<IFluidHandle<any>>;
const dynamicObjectsCollectionKey = "liveShareConsensusRegisterCollectionKey";

/**
 * Fluid DataObject used in `FluidTurboClient` for the purposes of dynamically loading DDSes.
 * @remarks
 * If a DDS does not yet exist for a given key, a new one is created. Fluid `ConsensusRegisterCollection` is used to ensure that only one person will create the DDS.
 */
export class DynamicObjectManagerClass extends LiveDataObject {
    /**
     * ConsensusRegisterCollection instance that stores handles for a given key using FWW.
     */
    private _dynamicObjectsCollection: DynamicObjectsCollection | undefined;
    /**
     * Local memory store for DDS's loaded dynamically.
     */
    private _dynamicObjectsMap: Map<string, Promise<FluidObject<any>>> =
        new Map();

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:DynamicObjectManager`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        DynamicObjectManagerClass.TypeName,
        DynamicObjectManagerClass,
        [ConsensusRegisterCollection.getFactory()],
        {}
    );

    /**
     * initializingFirstTime is run only once by the first client to create the DataObject.  Here we use it to
     * initialize the state of the DataObject.
     */
    protected async initializingFirstTime() {
        // We create the consensus registry collection just like any other DDS.
        const consensusRegisterCollection = ConsensusRegisterCollection.create(
            this.runtime,
            dynamicObjectsCollectionKey
        );
        // Set object(s) to root
        this.root.set(
            dynamicObjectsCollectionKey,
            consensusRegisterCollection.handle
        );
    }

    /**
     * hasInitialized is run by each client as they load the DataObject.  Here we use it to initialize the
     * task manager, listen for task assignments, and listen for changes to the dynamic objects map.
     */
    protected async hasInitialized() {
        // Get the dynamic objects map
        const dynamicObjectsCollectionHandle = this.root.get<
            IFluidHandle<DynamicObjectsCollection>
        >(dynamicObjectsCollectionKey);
        this._dynamicObjectsCollection =
            await dynamicObjectsCollectionHandle?.get();
    }

    /**
     * Convenience getter to get the `_dynamicObjectsCollection` without having to check for undefined, since this will
     * never be undefined after `initializingFirstTime`.
     */
    private get dynamicObjectsCollection() {
        assert(
            this._dynamicObjectsCollection !== undefined,
            "_dynamicObjectsCollection not initialized"
        );
        return this._dynamicObjectsCollection;
    }

    /**
     * Dynamically loads a Fluid object. If one does not exist, a new one will be created.
     *
     * @template T Type of Fluid object to load.
     * @param key unique key for the dynamic object
     * @param objectClass the Fluid SharedObjectKind
     * @param container Fluid container to load the DDS into
     * @param onDidFirstInitialize Optional. Callback that is used when the object was initially created, regardless of whether it is confirmed via consensus or not.
     * @returns the DDS and whether or not it was created locally
     */
    public async getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        key: string,
        objectClass: SharedObjectKind<T>,
        container: IFluidContainer,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<{
        dds: T;
        created: boolean;
    }> {
        // Check if the DDS already exists. If it does, return that.
        let dds: T | undefined = await this.internalGetDDS<T>(key);
        if (dds) {
            return {
                dds,
                created: false,
            };
        }
        // Create a new DDS to attempt to store it into consensusRegisterCollection. The localDDS may not be used if it has first been written by another client.
        // Fluid's garbage collector will clean up the DDS if it is not used.
        const localDDS = await container.create(objectClass);
        onDidFirstInitialize?.(localDDS);
        // Get the DDS with consensus
        return this.loadDDSWithConsensus<T>(key, localDDS);
    }

    /**
     * Get the DDS for a given unique identifier if it exists.
     *
     * @param key unique identifier
     * @returns existing DDS in the _dynamicObjectsMap or undefined if it does not exist
     */
    private async internalGetDDS<
        T extends FluidObject<any> = FluidObject<any> & IFluidLoadable
    >(key: string): Promise<T | undefined> {
        // Check if we already have the DDS / get DDS promise in memory
        const ddsInMemory = this._dynamicObjectsMap.get(key);
        if (ddsInMemory) {
            // Since already in memory, we return the existing one so that we never return two different DDS class instances per key
            return ddsInMemory as Promise<T>;
        }
        const ddsHandle = this.dynamicObjectsCollection.read(key);
        if (!ddsHandle) {
            return undefined;
        }
        const getPromise = ddsHandle?.get();
        // Cache the promise in memory for the key so that we never return two different DDS class instances per key
        this._dynamicObjectsMap.set(key, getPromise);
        return getPromise;
    }

    /**
     * Recursively attempt to write a DDS to the consensusRegisterCollection. This is necessary because we may disconnect mid-write.
     *
     * @param key unique identifier for DDS
     * @param localDDS the DDS to write if we are the first to write
     * @returns the DDS and whether or not it was created locally
     */
    private async loadDDSWithConsensus<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        key: string,
        localDDS: T
    ): Promise<{
        dds: T;
        created: boolean;
    }> {
        await this.waitUntilConnected();
        // Check if we have since received the DDS from dynamicObjectsCollection
        const dds = await this.internalGetDDS<T>(key);
        if (dds) {
            return {
                dds,
                created: false,
            };
        }
        // Attempt to write local DDS to dynamicObjectsCollection
        const acknowledged = await this.dynamicObjectsCollection.write(
            key,
            localDDS.handle
        );
        // If we successfully write, return the local DDS
        if (acknowledged) {
            // Cache the DDS in memory for the key so that we never return two different DDS class instances per key
            this._dynamicObjectsMap.set(key, Promise.resolve(localDDS));
            return {
                dds: localDDS,
                created: true,
            };
        }
        // Fluid did not acknowledge the write, either because the container disconnected or someone else created the object already, so we need to try again
        return await this.loadDDSWithConsensus<T>(key, localDDS);
    }
}

export type DynamicObjectManager = DynamicObjectManagerClass;

// eslint-disable-next-line no-redeclare
export const DynamicObjectManager = (() => {
    const kind = createDataObjectKind(DynamicObjectManagerClass);
    return kind as typeof kind & SharedObjectKind<DynamicObjectManagerClass>;
})();

/**
 * Register `DynamicObjectManager` as an available `SharedObjectKind` for use in packages that support dynamic object loading, such as `@microsoft/live-share`.
 */
DynamicObjectRegistry.registerObjectClass(
    DynamicObjectManager,
    DynamicObjectManager.TypeName
);
