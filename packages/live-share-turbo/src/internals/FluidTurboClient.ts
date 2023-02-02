/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    IFluidContainer,
    LoadableObjectClass,
    SharedMap,
} from "fluid-framework";
import { AzureContainerServices } from "@fluidframework/azure-client";
import { IFluidLoadable, FluidObject } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces/IFluidTurboClient";
import { TurboObjectManager } from "../dds-objects";

/**
 * Base class for building Fluid Turbo clients.
 * @remarks
 * Unlike other Fluid clients, the turbo client wraps functionality regularly exposed through an `IFluidContainer`. This is due to the more opinionated
 * nature of this package than vanilla Fluid Framework, where developers do not define a full `ContainerSchema` themselves and objects are loaded dynamically.
 */
export abstract class FluidTurboClient implements IFluidTurboClient {
    private _awaitConnectedPromise?: Promise<void>;

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
     * @see IFluidTurboClient.stateMap
     */
    public get stateMap(): SharedMap | undefined {
        if (this.results) {
            return this.results.container.initialObjects
                .TURBO_STATE_MAP as SharedMap;
        }
        return undefined;
    }

    private get dynamicObjects(): TurboObjectManager | undefined {
        if (this.results) {
            return this.results.container.initialObjects
                .TURBO_DYNAMIC_OBJECTS as TurboObjectManager;
        }
        return undefined;
    }

    /**
     * @see IFluidTurboClient.getDDS
     */
    public async getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        objectKey: string,
        objectClass: LoadableObjectClass<T>,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<T> {
        // The uniqueKey key makes the developer provided uniqueKey never conflict across different DDS objects
        if (!this.results || !this.dynamicObjects) {
            throw new Error(
                "FluidTurboClient: getDDS must have valid dynamicObjects TurboObjectManager"
            );
        }
        await this.waitUntilConnected();
        const initialDDS = this.results.container.initialObjects[objectKey] as
            | T
            | undefined;
        if (initialDDS !== undefined) {
            return initialDDS;
        }
        const uniqueKey = `<${objectClass.name}>:${objectKey}`;
        const response = await this.dynamicObjects.getDDS<T>(
            uniqueKey,
            objectClass,
            this.results.container
        );
        if (response.created) {
            onDidFirstInitialize?.(response.dds);
        }
        return response.dds;
    }

    private async waitUntilConnected(): Promise<void> {
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
