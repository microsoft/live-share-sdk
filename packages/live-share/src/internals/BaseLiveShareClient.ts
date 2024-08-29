/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ContainerSchema,
    FluidObject,
    IFluidContainer,
    SharedObjectKind,
} from "fluid-framework";
import { SharedMap } from "fluid-framework/legacy";
import { AzureContainerServices } from "@fluidframework/azure-client/internal";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry.js";
import { DynamicObjectManager } from "./DynamicObjectManager.js";
import { LiveShareRuntime } from "./LiveShareRuntime.js";
import {
    getRootDataObject,
    getContainerRuntime,
    getRootDirectory,
    TurboDirectory,
    TurboDynamicObjects,
    TurboStateMap,
} from "./smuggle.js";
import { getFactoryName } from "./fluid-duplicated.js";
import { ExpectedError } from "../errors.js";

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

    /**
     * Constructor to create a new BaseLiveShareClient instance.
     *
     * @param runtime Live Share runtime instance
     */
    protected constructor(runtime: LiveShareRuntime) {
        this._runtime = runtime;
    }

    /**
     * Get the Fluid join container results.
     * Includes Fluid container and Azure container services.
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
     * Join container functions to call. Used for generating helpful error messages when calling {@link getDDS}.
     */
    protected abstract getDDSErrorJoinFunctionText: string;

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

        const rootDataObject = getRootDataObject(this.results.container);
        const rootDirectory = getRootDirectory(rootDataObject);
        const turboDir = rootDirectory.getSubDirectory(TurboDirectory);

        if (turboDir) {
            this._turboDynamicObjects = await turboDir
                .get(TurboDynamicObjects)
                .get();
            this._turboStateMap = await turboDir.get(TurboStateMap).get();
        }
    }

    /**
     * Callback to load a Fluid DDS for a given key. If the object does not already exist, a new one will be created.
     * If the key matches an object in the `initialObjects` from your `ContainerSchema`, the initial object will be returned.
     *
     * @template T Type of Fluid object to load.
     * @param objectKey unique key for the Fluid DDS you'd like to load
     * @param objectClass Fluid SharedObjectKind you'd like to load of type T
     * @param onDidFirstInitialize Optional. Callback that is used when the object was initially created.
     * @returns DDS object corresponding to `objectKey`
     *
     * @throws error if you have not already joined the Fluid container.
     * @throws error if you are using a legacy container created prior to Live Share version 2.0.0 or greater.
     * 
     * @example
     ```ts
        import { LiveShareClient, LivePresence } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";

        // Join the Fluid container
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        // Create a LivePresence instance
        const presence = await client.getDDS("unique-id", LivePresence, (dds) => {
            console.log("first created dds", dds);
        });
     ```
     */
    public async getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable,
    >(
        objectKey: string,
        objectClass: SharedObjectKind<T>,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<T> {
        ExpectedError.assert(
            !!this.results,
            "BaseLiveShareClient:getDDS",
            "cannot call until successfully joined a FluidContainer",
            `To fix this issue, call the ${this.getDDSErrorJoinFunctionText} function before using this API.`
        );

        await this.waitUntilConnected();
        try {
            const initialDDS = this.results.container.initialObjects[
                objectKey
            ] as T | undefined;
            if (initialDDS !== undefined) {
                return initialDDS;
            }
        } catch (e) {
            // ignore "Initial Objects were not correctly initialized" error if none defined.
        }

        const dynamicObjects = await this.dynamicObjects();
        ExpectedError.assert(
            !!dynamicObjects,
            "BaseLiveShareClient:getDDS",
            "getDDS must have valid dynamicObjects DynamicObjectManager instance. This implies this container was created with a version of Live Share prior to 2.0.0 or greater.",
            "To fix this error, please create a new Fluid container and try again."
        );

        // The uniqueKey key makes the developer provided uniqueKey never conflict across different DDS objects
        const className =
            (objectClass as any).name ??
            getFactoryName(objectClass) ??
            "unknown";
        const uniqueKey = `<${className}>:${objectKey}`;
        const response = await dynamicObjects.getDDS<T>(
            uniqueKey,
            objectClass,
            this.results.container,
            onDidFirstInitialize
        );
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
            // Get the static registry of SharedObjectKind types.
            dynamicObjectTypes: [
                ...(schema?.dynamicObjectTypes ?? []),
                ...DynamicObjectRegistry.dynamicLoadableObjects.values(),
            ] as unknown as SharedObjectKind[],
        };
    }

    /**
     * Utility function to wait until the Fluid container is connected.
     *
     * @returns promise that will resolve once the container connects.
     */
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

    /**
     * @internal
     * Adds additional objects needed by Live Share to the Fluid container's root data object.
     * Intended for use only when extending `BaseLiveShareClient`.
     * This should be called only when the container is first created.
     *
     * @param container Fluid container to add the objects to.
     */
    protected async addTurboFolder(container: IFluidContainer) {
        const rootDataObject = getRootDataObject(container);
        const rootDirectory = getRootDirectory(rootDataObject);
        const containerRuntime = getContainerRuntime(rootDataObject);

        const turboDir = rootDirectory.createSubDirectory(TurboDirectory);
        const obj = await SharedMap.create(containerRuntime, undefined);
        turboDir.set(TurboStateMap, obj.handle);

        const turboObjectManager = await container.create(DynamicObjectManager);
        turboDir.set(TurboDynamicObjects, turboObjectManager.handle);
    }
}
