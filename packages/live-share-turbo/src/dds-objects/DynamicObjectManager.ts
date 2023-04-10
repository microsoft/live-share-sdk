/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import {
    LoadableObjectClass,
    IFluidContainer,
} from "fluid-framework";
import {
    IFluidHandle,
    FluidObject,
    IFluidLoadable,
} from "@fluidframework/core-interfaces";
import { assert } from "@fluidframework/common-utils";
import { ConsensusRegisterCollection } from "@fluidframework/register-collection";
import { DynamicObjectRegistry } from "@microsoft/live-share";

// Register ConsensusRegisterCollection
DynamicObjectRegistry.registerObjectClass(ConsensusRegisterCollection, ConsensusRegisterCollection.getFactory().type);

type DynamicObjectsCollection = ConsensusRegisterCollection<IFluidHandle<any>>;
const dynamicObjectsCollectionKey = "<<consensusRegisterCollectionKey>>";

/**
 * Fluid DataObject used in `FluidTurboClient` for the purposes of dynamically loading DDSes.
 * @remarks
 * If a DDS does not yet exist for a given key, a new one is created. Fluid `ConsensusRegisterCollection` is used to ensure that only one person will create the DDS.
 */
export class DynamicObjectManager extends DataObject {
    private _dynamicObjectsCollection: DynamicObjectsCollection | undefined;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:DynamicObjectManager`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        DynamicObjectManager.TypeName,
        DynamicObjectManager,
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
     * @param loadableClass the Fluid LoadableObjectClass
     * @param container Fluid container to load the DDS into
     * @returns the DDS and whether or not it was created locally
     */
    public async getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        key: string,
        loadableClass: LoadableObjectClass<T>,
        container: IFluidContainer
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
        const localDDS = await container.create(loadableClass);
        // Get the DDS with consensus
        return this.loadDDSWithConsensus(key, localDDS);
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
        const ddsHandle = this.dynamicObjectsCollection.read(key);
        return ddsHandle?.get();
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
    >(key: string, localDDS: T): Promise<{
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
        const acknowledged = await this.dynamicObjectsCollection.write(key, localDDS.handle);
        // If we successfully write, return the local DDS
        if (acknowledged) {
            return {
                dds: localDDS,
                created: true,
            };
        }
        // Fluid did not acknowledge the write, either because the container disconnected or someone else created the object already, so we need to try again
        return await this.loadDDSWithConsensus(key, localDDS);
    }

    /**
     * Wait until the socket is connected before continuing.
     * @returns promise with clientId that resolves when the socket is connected
     */
    private waitUntilConnected(): Promise<string> {
        return new Promise((resolve) => {
            const onConnected = (clientId: string) => {
                this.runtime.off("connected", onConnected);
                resolve(clientId);
            };

            if (this.runtime.connected) {
                resolve(this.runtime.clientId as string);
            } else {
                this.runtime.on("connected", onConnected);
            }
        });
    }
}
