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
    LiveCanvas: {
        PointerMovedEventError: "LiveCanvas:PointerMovedEventError",
        AddWetStrokeEventError: "LiveCanvas:AddWetStrokeEventError",
        BeginWetStrokeError: "LiveCanvas:BeginWetStrokeError",
    },
};
