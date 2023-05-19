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

/**
 * @hidden
 */
export const BASE_CONTAINER_SCHEMA: ContainerSchema = {
    initialObjects: {
        TURBO_STATE_MAP: SharedMap,
        TURBO_DYNAMIC_OBJECTS: DynamicObjectManager,
    },
};
