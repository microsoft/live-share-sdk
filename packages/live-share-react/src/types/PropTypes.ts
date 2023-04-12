/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export type SharedMapInitialData<T> =
    | Map<string, T>
    | readonly (readonly [string, T])[]
    | { [key: string]: T }
    | undefined;
