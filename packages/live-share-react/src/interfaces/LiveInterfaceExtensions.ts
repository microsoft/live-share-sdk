/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export interface IReceiveLiveEvent<TEvent = any> {
    value: TEvent;
    local: boolean;
}
