/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { CompatibilityMode } from "@fluidframework/azure-client";

/**
 * List of telemetry events.
 * @hidden
 * @remarks
 * Wrap with a call to transmit() if the event should be transmitted to the telemetry service.
 */
export const TelemetryEvents = {
    LivePresence: {
        LocalPresenceChanged: "LivePresence:LocalPresenceChange",
        RemotePresenceChanged: "LivePresence:RemotePresenceChange",
        GetClientInfoError: "LivePresence:GetClientInfoError",
        RoleVerificationError: "LivePresence:RoleVerificationError",
    },
    LiveState: {
        StateChanged: "LiveState:StateChanged",
        RoleVerificationError: "LiveState:RoleVerificationError",
    },
};

/**
 * @hidden
 */
function transmit(eventName: string): string {
    return `${eventName}#transmit`;
}

/**
 * @hidden
 */
export const ObjectSynchronizerEvents = {
    update: "update",
    connect: "connect",
};

/**
 * @hidden
 */
export const LiveShareReportIssueLink = "https://aka.ms/teamsliveshare/issue";

/**
 * @hidden
 */
export const FluidCompatibilityMode: CompatibilityMode = "2";
