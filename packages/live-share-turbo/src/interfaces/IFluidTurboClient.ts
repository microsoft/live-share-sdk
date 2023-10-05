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
    get canSendBackgroundUpdates(): boolean;
    set canSendBackgroundUpdates(value: boolean);
    /**
     * Callback to load a Fluid DDS for a given key. If the object does not already exist, a new one will be created.
     *
     * @template T Type of Fluid object to load.
     * @param objectKey unique key for the Fluid DDS you'd like to load
     * @param objectClass Fluid LoadableObjectClass you'd like to load of type T
     * @param onDidFirstInitialize Optional. Callback that is used when the object was initially created.
     * @returns DDS object corresponding to `objectKey`
     */
    getDDS<T extends IFluidLoadable = FluidObject<any> & IFluidLoadable>(
        objectKey: string,
        objectClass: LoadableObjectClass<T>,
        onDidFirstInitialize?: (dds: T) => void
    ): Promise<T>;
}
