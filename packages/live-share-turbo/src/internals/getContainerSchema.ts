/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DynamicObjectRegistry } from "@microsoft/live-share";
import {
    ContainerSchema,
    LoadableObjectClassRecord,
    SharedMap,
} from "fluid-framework";
import { DynamicObjectManager } from "../dds-objects";
import { TaskManager  } from "@fluid-experimental/task-manager";

// Register TaskManager as dynamic object
DynamicObjectRegistry.registerObjectClass(TaskManager, "TaskManager");

const schema: ContainerSchema = {
    initialObjects: {
        TURBO_STATE_MAP: SharedMap,
        TURBO_DYNAMIC_OBJECTS: DynamicObjectManager,
    },
};

/**
 * Get the container schema to use within a `FluidTurboClient` container.
 * 
 * @param initialObjects Optional. Initial objects to add to the schema
 * @returns a `ContainerSchema` record to use in a Fluid container
 */
export function getContainerSchema(initialObjects?: LoadableObjectClassRecord): ContainerSchema {
    return {
        initialObjects: {
            ...schema.initialObjects,
            ...initialObjects,
        },
        // Get the static registry of LoadableObjectClass types.
        dynamicObjectTypes: [...DynamicObjectRegistry.dynamicLoadableObjects.values()],
    };
}
