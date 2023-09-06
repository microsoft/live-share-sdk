/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ExtendedMediaSessionActionDetails,
    ExtendedMediaSessionActionHandler,
} from "./MediaSessionExtensions";

/**
 * Base class for action throttlers.
 */
export abstract class MediaSessionActionThrottler {
    public abstract throttled(
        details: MediaSessionActionDetails | ExtendedMediaSessionActionDetails,
        handler?: MediaSessionActionHandler | ExtendedMediaSessionActionHandler
    ): void;
}
