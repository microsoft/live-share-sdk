/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LoadableObjectClass, SharedMap } from "fluid-framework";
import { IFluidLoadable, FluidObject } from "@fluidframework/core-interfaces";

export interface IFluidTurboClient {
    get stateMap(): SharedMap | undefined;
    getDDS<
        T extends IFluidLoadable = FluidObject<any> & IFluidLoadable
    >(
        objectKey: string,
        objectClass: LoadableObjectClass<T>,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<T>;
}