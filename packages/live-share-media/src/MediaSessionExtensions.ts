/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export interface MediaSessionCoordinatorSuspension {
    waitPoint?: CoordinationWaitPoint;
    end(seekTo?: number): void;
}

export type MediaSessionCoordinatorState = "closed" | "waiting" | "joined";

export enum MediaSessionCoordinatorEvents {
    coordinatorstatechange = "coordinatorstatechange",
    triggeraction = "triggeraction",
}

export type ExtendedMediaSessionAction =
    | MediaSessionAction
    | "settrack"
    | "wait"
    | "catchup"
    | "datachange"
    | "blocked";

export type ExtendedMediaSessionPlaybackState =
    | MediaSessionPlaybackState
    | "suspended"
    | "waiting"
    | "ended";

export interface ExtendedMediaMetadata extends MediaMetadata {
    trackIdentifier: string;
    liveStream: boolean;
}

export interface CoordinationWaitPoint {
    position: number;
    reason?: string;
    maxClients?: number;
}

export interface ExtendedMediaSessionActionDetails {
    action: ExtendedMediaSessionAction;
    clientId: string;
    fastSeek?: boolean | null;
    seekOffset?: number | null;
    seekTime?: number | null;
    metadata?: ExtendedMediaMetadata | null;
    suspension?: MediaSessionCoordinatorSuspension | null;
    data?: object | null;
    blocked?: ExtendedMediaSessionAction | null;
}

export interface ExtendedMediaSessionActionHandler {
    (details: ExtendedMediaSessionActionDetails): void;
}
