/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * List of telemetry events. 
 * 
 * #### remarks
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

function transmit(eventName: string): string {
    return `${eventName}#transmit`;
}
