/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ExtendedMediaSessionActionDetails } from "./MediaSessionExtensions";

/**
 * Base class for action throttlers.
 */
export abstract class MediaSessionActionThrottler {
    public abstract throttled(
        details: ExtendedMediaSessionActionDetails,
        handler?: MediaSessionActionHandler
    ): void;
}
