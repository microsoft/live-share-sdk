/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

/**
 * Object response for a received event
 */
export interface IReceiveLiveEvent<TEvent = any> {
    /**
     * The value of the event that was sent
     */
    value: TEvent;
    /**
     * True if the local client was the one to send this event
     */
    local: boolean;
    /**
     * Client ID of the user that sent the event
     */
    clientId: string;
    /**
     * Server timestamp at which the event was sent
     */
    timestamp: number;
}
