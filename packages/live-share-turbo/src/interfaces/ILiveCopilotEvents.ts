import { IEvent } from "@fluidframework/common-definitions";

/**
 * Events supported by `LiveCoPilot` object.
 */
export enum LiveCoPilotEvents {
    /**
     * The prompt value has changed.
     */
    promptChanged = "promptChanged",
    /**
     * The completion value has changed.
     * @remarks this event will only emit if the prompt change took place for the current prompt.
     */
    completionChanged = "completionChanged",
    /**
     * Lock granted.
     */
    lockGranted = "lockGranted",
    /**
     * Lock lost.
     */
    lockLost = "lockLost",
}

/**
 * Event typings for `LiveCoPilot` class.
 */
export interface ILiveCoPilotEvents extends IEvent {
    /**
     * An `LiveCoPilot` prompt value has changed.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.promptValue The new prompt value.
     * @param listener.local If true, a local prompt change occurred.
     * @param listener.completionValuePromise Promise for pending completion for the prompt. Will reject if the prompt changes.
     * @param listener.referenceId The reference id of the prompt change, which can be used to correlate the prompt change with the completion changes.
     */
    (
        event: LiveCoPilotEvents.promptChanged,
        listener: (
            promptValue: string,
            local: boolean,
            completionValuePromise: Promise<string>,
            referenceId: string
        ) => void
    ): any;
    /**
     * An `LiveCoPilot` completion value has changed.
     * @remarks
     * This event will only emit if the prompt change took place for the current prompt.
     *
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.completionValue The new prompt value.
     * @param listener.local If true, a local prompt change occurred.
     * @param listener.promptValue The value of the prompt used to generate the completion.
     * @param listener.referenceId The reference id of the prompt change, which can be used to correlate the prompt change with the completion changes.
     */
    (
        event: LiveCoPilotEvents.completionChanged,
        listener: (
            completionValue: string,
            local: boolean,
            promptValue: string,
            referenceId: string
        ) => void
    ): any;
    /**
     * The local user has been granted permission to change completion values.
     *
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     */
    (event: LiveCoPilotEvents.lockGranted, listener: () => void): any;
    /**
     * The local user has lost permission to change completion values.
     *
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     */
    (event: LiveCoPilotEvents.lockLost, listener: () => void): any;
}
