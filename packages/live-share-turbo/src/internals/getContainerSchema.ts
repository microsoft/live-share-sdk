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

const schema: ContainerSchema = {
    initialObjects: {
        TURBO_STATE_MAP: SharedMap,
        TURBO_DYNAMIC_OBJECTS: SharedMap,
    },
};

export function getContainerSchema(initialObjects?: LoadableObjectClassRecord): ContainerSchema {
    return {
        initialObjects: {
            ...schema.initialObjects,
            ...initialObjects,
        },
        // Get the static registry of LoadableObjectClass types.
        dynamicObjectTypes: DynamicObjectRegistry.dynamicLoadableObjects,
    };
}
