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
    EphemeralPresence: {
        LocalPresenceChanged: 'EphemeralPresence:LocalPresenceChange',
        RemotePresenceChanged: 'EphemeralPresence:RemotePresenceChange'
    },
    EphemeralState: {
        StateChanged: 'EphemeralState:StateChanged',
        RoleVerificationError: 'EphemeralState:RoleVerificationError',
    }
}

/**
 * @hidden
 */
function transmit(eventName: string): string {
    return `${eventName}#transmit`;
}
