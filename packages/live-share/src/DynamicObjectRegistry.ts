/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    LoadableObjectClass,
    SharedMap,
    SharedString,
    SharedDirectory,
} from "fluid-framework";

/**
 * Key for window global reference to loadable objects.
 * TODO: replace window reference with a better static registry system. Originally tried DynamicObjectRegistry._dynamicLoadableObjects
 * variable but that didn't work when testing locally, since all local package builds have separate symlink instances and thus have separate
 * static DynamicObjectRegistry classes.
 */
const GLOBAL_WINDOW_KEY = "@microsoft/live-share:DYNAMIC-LOADABLE-OBJECTS";

/**
 * Static registry class for loadable projects for use in frameworks like `@microsoft/live-share-turbo`. All Live Share packages and extension
 * frameworks (e.g., `LiveMediaSession` in our media package) will register their classes from within their main files. Goal of this class is for
 * all Live Share packages that a developer has installed will be registered as available dynamic objects without the core package needing to be
 * aware of what every DDS is.
 */
export class DynamicObjectRegistry {
    private static _dynamicLoadableObjects: Map<
        string,
        LoadableObjectClass<any>
    > = new Map<string, LoadableObjectClass<any>>();
    /**
     * Get all registered dynamic loadable objects
     */
    public static get dynamicLoadableObjects(): Map<
        string,
        LoadableObjectClass<any>
    > {
        if (typeof window === "undefined") {
            return this._dynamicLoadableObjects;
        }
        return ((window as any)[GLOBAL_WINDOW_KEY] ||
            this._dynamicLoadableObjects) as Map<
            string,
            LoadableObjectClass<any>
        >;
    }

    /**
     * Static method to register a new dynamic loadable object class.
     *
     * @remarks
     * Duplicate classes will be ignored.
     *
     * @param loadableObjectClass the Fluid loadable object class to register
     */
    public static registerObjectClass(
        loadableObjectClass: LoadableObjectClass<any>,
        typeName: string
    ) {
        const loadableObjects = this.dynamicLoadableObjects;
        if (loadableObjects.has(typeName)) return;
        loadableObjects.set(typeName, loadableObjectClass);
        if (typeof window !== "undefined") {
            (window as any)[GLOBAL_WINDOW_KEY] = loadableObjects;
        }
    }
}

/**
 * Register default Fluid packages. If we can someday contribute Fluid code to make this happen centrally within Fluid, we can remove this in
 * the future.
 */
DynamicObjectRegistry.registerObjectClass(
    SharedMap,
    SharedMap.getFactory().type
);
DynamicObjectRegistry.registerObjectClass(
    SharedString,
    SharedString.getFactory().type
);
DynamicObjectRegistry.registerObjectClass(
    SharedDirectory,
    SharedDirectory.getFactory().type
);
