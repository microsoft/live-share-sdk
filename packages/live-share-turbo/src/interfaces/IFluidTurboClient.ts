/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LoadableObjectClass, SharedMap } from "fluid-framework";
import { IFluidLoadable, FluidObject } from "@fluidframework/core-interfaces";

export interface IFluidTurboClient {
    /**
     * Default SharedMap included in all clients for the purposes of tracking simple app state
     */
    get stateMap(): SharedMap | undefined;
    /**
     * Callback to load a Fluid DDS for a given key. If the object does not already exist, a new one will be created.
     *
     * @param objectKey unique key for the Fluid DDS you'd like to load
     * @param objectClass Fluid LoadableObjectClass you'd like to load of type T
     * @param onDidFirstInitialize Optional. Callback that is used when the object was initially created.
     * @returns DDS object corresponding to `objectKey`
     */
    getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        objectKey: string,
        objectClass: LoadableObjectClass<T>,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<T>;
}