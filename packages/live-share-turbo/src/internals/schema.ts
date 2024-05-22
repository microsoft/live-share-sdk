/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ContainerSchema } from "fluid-framework";
import { SharedMap } from "fluid-framework/legacy";
import { DynamicObjectManager } from "../dds-objects";

/**
 * @hidden
 */
export const BASE_CONTAINER_SCHEMA: ContainerSchema = {
    initialObjects: {
        TURBO_STATE_MAP: SharedMap,
        TURBO_DYNAMIC_OBJECTS: DynamicObjectManager,
    },
};
