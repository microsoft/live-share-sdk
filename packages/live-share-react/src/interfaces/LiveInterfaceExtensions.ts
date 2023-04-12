/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export interface IReceiveLiveEvent<TEvent extends object = object> {
    event: TEvent;
    local: boolean;
}
