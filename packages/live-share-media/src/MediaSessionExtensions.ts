/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

/**
 * Suspension object for when group synchronization is suspended for the local user.
 */
export interface MediaSessionCoordinatorSuspension {
    /**
     * The wait point that the suspension was created with.
     *
     * @remarks
     * If undefined, the suspension was not created with a wait point.
     */
    waitPoint?: CoordinationWaitPoint;
    /**
     * Ends the suspension.
     *
     * @param seekTo the timestamp to seek to after the suspension ends.
     * If no value is provided, the local user will return to the group playback position.
     *
     * @remarks
     * If there are other suspensions active, all other suspensions must be ended before group synchronization can resume.
     */
    end(seekTo?: number): void;
}

/**
 * Wait point interface for a suspension.
 *
 * @remarks
 * Used by {@link MediaSessionCoordinatorSuspension} to schedule a suspension at a specific media position.
 */
export interface CoordinationWaitPoint {
    /**
     * The position in milliseconds that the suspension should begin.
     */
    position: number;
    /**
     * Optional. The reason for the suspension.
     */
    reason?: string;
    /**
     * Optional. The max clients to wait for before a suspension ends.
     */
    maxClients?: number;
}

/**
 * The state of the `LiveMediaSessionCoordinator`.
 */
export type MediaSessionCoordinatorState = "closed" | "waiting" | "joined";

/**
 * Event types of `LiveMediaSessionCoordinator`.
 */
export enum MediaSessionCoordinatorEvents {
    /**
     * Event emitted after the coordinator's state changed
     */
    coordinatorstatechange = "coordinatorstatechange",
    /**
     * Event emitted when an action was triggered.
     */
    triggeraction = "triggeraction",
}

/**
 * Action types supported for `LiveMediaSession`.
 *
 * @remarks
 * These types extend the default actions supported by the `MediaSession` specification in browsers.
 * These additional actions help with group synchronization.
 */
export type ExtendedMediaSessionAction =
    | MediaSessionAction
    | "settrack"
    | "wait"
    | "catchup"
    | "datachange"
    | "blocked";

/**
 * Extended playback state for `LiveMediaSession`.
 *
 * @remarks
 * These types extend the default state types supported by the `MediaSession` specification in browsers.
 * These additional types help with group synchronization.
 */
export type ExtendedMediaSessionPlaybackState =
    | MediaSessionPlaybackState
    | "suspended"
    | "waiting"
    | "ended";

/**
 * The source of the action for `LiveMediaSession`.
 *
 * @remarks
 * Is `user` when the action was explicitly invoked via the `LiveMediaSessionCoordinator`.
 * Is `system` when the action was invoked via `GroupCoordinatorState` when the local client is out of sync.
 */
export type ExtendedMediaSessionActionSource = "user" | "system";

/**
 * Metadata for `LiveMediaSession`.
 *
 * @remarks
 * These types extend the default session metadata supported by the `MediaSession` specification in browsers.
 * These additional types help with group synchronization.
 */
export interface ExtendedMediaMetadata extends MediaMetadata {
    /**
     * A unique identifier for the track (e.g., UUID, URL, etc.)
     */
    trackIdentifier: string;
    /**
     * Flag indicating whether or not the stream is a live broadcast.
     */
    liveStream?: boolean;
}

/**
 * Details for emitted actions from `LiveMediaSession`.
 *
 * @remarks
 * These types extend the default event details supported by the `MediaSession` specification in browsers.
 * These additional types help with group synchronization.
 */
export interface ExtendedMediaSessionActionDetails {
    /**
     * The action type of this event.
     */
    action: ExtendedMediaSessionAction;
    /**
     * The source of the action.
     *
     * @remarks
     * Is `user` when the action was explicitly invoked via the `LiveMediaSessionCoordinator`.
     * Is `system` when the action was invoked via `GroupCoordinatorState` when the local client is out of sync.
     */
    source: ExtendedMediaSessionActionSource;
    /**
     * Unique identifier of the client that triggered this action.
     */
    clientId: string;
    /**
     * Flag indicating whether or not the action was triggered by the local client.
     */
    local: boolean;
    /**
     * Flag indicating whether or not this was a fast seek action.
     */
    fastSeek?: boolean | null;
    /**
     * The offset of the seek.
     */
    seekOffset?: number | null;
    /**
     * Timestamp of the seek event.
     */
    seekTime?: number | null;
    /**
     * Updated session metadata that was changed via this action.
     */
    metadata?: ExtendedMediaMetadata | null;
    /**
     * Suspension associated with this action.
     */
    suspension?: MediaSessionCoordinatorSuspension | null;
    /**
     * Custom data associated with this action.
     */
    data?: object | null;
    /**
     * Action type that was blocked.
     */
    blocked?: ExtendedMediaSessionAction | null;
}

/**
 * Handler for `LiveMediaSession` actions.
 */
export interface ExtendedMediaSessionActionHandler {
    (details: ExtendedMediaSessionActionDetails): void;
}
