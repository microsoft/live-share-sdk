/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

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
 * The oldest Fluid client version that must be able to access documents we write.
 *
 * @remarks
 * Fluid 3.0 removed the legacy `CompatibilityMode` values (`"1"` / `"2"`), so this must be a
 * SemVer string. `"2.0.0"` preserves collaboration with Fluid 2.0.0-era clients and matches
 * Fluid 3's own default.
 *
 * Deliberately left unannotated: the corresponding Fluid type is named
 * `MinimumVersionForCollab` in 2.102-2.115 and `OldestSupportedClientVersion` from 2.116
 * onward, so naming either one would break against part of our supported range. The inferred
 * literal type `"2.0.0"` satisfies both.
 *
 * @hidden
 */
export const FluidOldestSupportedClient = "2.0.0";
