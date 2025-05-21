/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    LocalDocumentServiceFactory,
    LocalResolver,
    createLocalResolverCreateNewRequest,
} from "@fluidframework/local-driver/legacy";
import { LocalDeltaConnectionServer } from "@fluidframework/server-local-server";

/**
 * @internal
 */
export const LocalDriverApi = {
    LocalDocumentServiceFactory,
    LocalDeltaConnectionServer,
    LocalResolver,
    createLocalResolverCreateNewRequest,
};

/**
 * @internal
 */
export type LocalDriverApiType = typeof LocalDriverApi;
