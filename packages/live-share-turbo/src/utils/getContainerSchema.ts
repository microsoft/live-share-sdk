/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DynamicObjectRegistry } from "@microsoft/live-share";
import {
    ContainerSchema,
    SharedMap,
} from "fluid-framework";

const schema: ContainerSchema = {
    initialObjects: {
        stateMap: SharedMap,
        dynamicObjects: SharedMap,
    },
};

export function getContainerSchema(): ContainerSchema {
    return {
        initialObjects: schema.initialObjects,
        // Get the static registry of LoadableObjectClass types.
        dynamicObjectTypes: DynamicObjectRegistry.dynamicLoadableObjects,
    };
}
