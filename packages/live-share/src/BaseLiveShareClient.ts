/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ContainerSchema,
    IFluidContainer,
    LoadableObjectClass,
} from "fluid-framework";
import { SharedMap } from "fluid-framework/legacy";
import { AzureContainerServices } from "@fluidframework/azure-client";
import { IFluidLoadable, FluidObject } from "@fluidframework/core-interfaces";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";
import { DynamicObjectManager } from "./DynamicObjectManager";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { getContainerEntryPoint, getRootDirectory } from "./internals/smuggle";

/**
 * Base class for building Fluid Turbo clients.
 * @remarks
 * Unlike other Fluid clients, the turbo client wraps functionality regularly exposed through an `IFluidContainer`. This is due to the more opinionated
 * nature of this package than vanilla Fluid Framework, where developers do not define a full `ContainerSchema` themselves and objects are loaded dynamically.
 */
export abstract class BaseLiveShareClient {
    private _awaitConnectedPromise?: Promise<void>;
    protected _runtime: LiveShareRuntime;
    private _turboStateMap?: SharedMap;
    private _turboDynamicObjects?: DynamicObjectManager;

    protected constructor(runtime: LiveShareRuntime) {
        this._runtime = runtime;
    }

    /**
     * Get the Fluid join container results
     */
    public abstract get results():
        | {
              container: IFluidContainer;
              services: AzureContainerServices;
          }
        | undefined;

    /**
     * Default SharedMap included in all clients for the purposes of tracking simple app state
     */
    public get stateMap(): SharedMap | undefined {
        if (this._turboStateMap) {
            return this._turboStateMap;
        }
        return undefined;
    }

    /**
     * Setting for whether `LiveDataObject` instances using `LiveObjectSynchronizer` can send background updates.
     * Default value is `true`.
     *
     * @remarks
     * This is useful for scenarios where there are a large number of participants in a session, since service performance degrades as more socket connections are opened.
     * Intended for use when a small number of users are intended to be "in control", such as the `LiveFollowMode` class's `startPresenting()` feature.
     * There should always be at least one user in the session that has `canSendBackgroundUpdates` set to true.
     * Set to true when the user is eligible to send background updates (e.g., "in control"), or false when that user is not in control.
     * This setting will not prevent the local user from explicitly changing the state of objects using `LiveObjectSynchronizer`, such as `.set()` in `LiveState`.
     * Impacts background updates of `LiveState`, `LivePresence`, `LiveTimer`, and `LiveFollowMode`.
     */
    public get canSendBackgroundUpdates(): boolean {
        return this._runtime.canSendBackgroundUpdates;
    }

    public set canSendBackgroundUpdates(value: boolean) {
        this._runtime.canSendBackgroundUpdates = value;
    }

    private async dynamicObjects(): Promise<DynamicObjectManager | undefined> {
        if (!this._turboDynamicObjects) {
            await this.loadFromTurboDirectory();
        }
        return this._turboDynamicObjects;
    }

    private async loadFromTurboDirectory() {
        if (!this.results) {
            return;
        }

        const rootDataObject = getContainerEntryPoint(this.results.container);
        const rootDirectory = getRootDirectory(rootDataObject);
        const turboDir = rootDirectory.getSubDirectory("turbo-directory");

        if (turboDir) {
            this._turboDynamicObjects = await turboDir
                .get("TURBO_DYNAMIC_OBJECTS")
                .get();
            this._turboStateMap = await turboDir.get("TURBO_STATE_MAP").get();
        }
    }

    /**
     * Callback to load a Fluid DDS for a given key. If the object does not already exist, a new one will be created.
     *
     * @template T Type of Fluid object to load.
     * @param objectKey unique key for the Fluid DDS you'd like to load
     * @param objectClass Fluid LoadableObjectClass you'd like to load of type T
     * @param onDidFirstInitialize Optional. Callback that is used when the object was initially created.
     * @returns DDS object corresponding to `objectKey`
     */
    public async getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        objectKey: string,
        objectClass: LoadableObjectClass<T>,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<T> {
        // The uniqueKey key makes the developer provided uniqueKey never conflict across different DDS objects
        if (!this.results) {
            throw new Error(
                "FluidTurboClient getDDS: cannot call until successful get/create/join FluidContainer"
            );
        }

        await this.waitUntilConnected();
        try {
            const initialDDS = this.results.container.initialObjects[
                objectKey
            ] as T | undefined;
            if (initialDDS !== undefined) {
                return initialDDS;
            }
        } catch (e) {
            console.trace(
                "getDDS, No initial objects defined, which is an error in fluid that we don't care about, will use all dynamic"
            );
        }

        const dynamicObjects = await this.dynamicObjects();
        if (!dynamicObjects) {
            throw new Error(
                "FluidTurboClient: getDDS must have valid dynamicObjects DynamicObjectManager"
            );
        }

        // TODO: investigate fixes
        // Fluid v2.0.0 removed "name" from their interfaces...
        // This likely causes problems for non Live Share DDSs (which have static name fields)
        const className = (objectClass as any).name ?? "unknown";
        const uniqueKey = `<${className}>:${objectKey}`;
        const response = await dynamicObjects.getDDS<T>(
            uniqueKey,
            objectClass,
            this.results.container
        );
        if (response.created) {
            onDidFirstInitialize?.(response.dds);
        }
        return response.dds;
    }

    /**
     * Get the container schema to use within a `BaseLiveShareClient` container.
     *
     * @param initialObjects Optional. Initial objects to add to the schema
     * @returns a `ContainerSchema` record to use in a Fluid container
     */
    protected getContainerSchema(schema?: ContainerSchema): ContainerSchema {
        return {
            initialObjects: {
                ...schema?.initialObjects,
            },
            // Get the static registry of LoadableObjectClass types.
            dynamicObjectTypes: [
                ...(schema?.dynamicObjectTypes ?? []),
                ...DynamicObjectRegistry.dynamicLoadableObjects.values(),
            ],
        };
    }

    protected async waitUntilConnected(): Promise<void> {
        if (this._awaitConnectedPromise) {
            return this._awaitConnectedPromise;
        }
        this._awaitConnectedPromise = new Promise((resolve, reject) => {
            if (!this.results?.container) {
                reject(
                    new Error(
                        "FluidTurboClient awaitConnected: cannot load DDS without a Fluid container"
                    )
                );
                this._awaitConnectedPromise = undefined;
            } else {
                const onConnected = () => {
                    this.results?.container.off("connected", onConnected);
                    resolve();
                };
                // Wait until connected event to ensure we have the latest document
                // and don't accidentally override a dds handle recently created
                // by another client
                if (this.results.container.connectionState === 2) {
                    resolve();
                } else {
                    this.results.container.on("connected", onConnected);
                }
            }
        });
        return this._awaitConnectedPromise;
    }
}
