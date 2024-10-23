/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { AzureContainerServices } from "@fluidframework/azure-client";
import {
    ITimerConfig,
    LivePresenceUser,
    LiveEvent,
    LivePresence,
    LiveTimer,
    IFollowModeState,
    FollowModePresenceUser,
    LiveFollowMode,
    LivePresenceData,
} from "@microsoft/live-share";
import { InkingManager, LiveCanvas } from "@microsoft/live-share-canvas";
import {
    CoordinationWaitPoint,
    ExtendedMediaMetadata,
    MediaPlayerSynchronizer,
} from "@microsoft/live-share-media";
import {
    IFluidContainer,
    ITree,
    ImplicitFieldSchema,
    TreeFieldFromImplicitField,
    TreeView,
} from "fluid-framework";
import { SharedMap } from "fluid-framework/legacy";
import {
    useSharedMap,
    useTreeNode,
    useSharedTree,
} from "../shared-hooks/index.js";
import {
    useLiveEvent,
    useLivePresence,
    useMediaSynchronizer,
    useLiveTimer,
    useLiveCanvas,
    useLiveFollowMode,
} from "../live-hooks/index.js";
import { IReceiveLiveEvent } from "../interfaces/index.js";
import {
    OnPauseTimerAction,
    OnPlayTimerAction,
    OnStartTimerAction,
    OnUpdateLivePresenceAction,
    SendLiveEventAction,
} from "./ActionTypes.js";

export interface IAzureContainerResults {
    /**
     * Fluid Container.
     */
    container: IFluidContainer;
    /**
     * Azure container services which has information such as current socket connections.
     */
    services: AzureContainerServices;
}

export interface ILiveShareContainerResults extends IAzureContainerResults {
    /**
     * Whether the local user/client initially created the container.
     */
    created: boolean;
}

/**
 * @deprecated use {@link useSharedTree} instead.
 *
 * Return type of {@link useSharedMap} hook.
 */
export interface IUseSharedMapResults<TData> {
    /**
     * The Fluid `SharedMap` object.
     */
    sharedMap: (Map<string, TData> & SharedMap) | undefined;
    /**
     * Callback method to get entries in the `SharedMap`.
     */
    getEntry: (key: string) => TData | undefined;
    /**
     * Callback method to set/replace new entries in the `SharedMap`.
     */
    setEntry: (key: string, value: TData) => void;
    /**
     * Callback method to delete an existing entry in the `SharedMap`.
     */
    deleteEntry: (key: string) => void;
}

/**
 * Return type of {@link useSharedTree} hook.
 */
export interface IUseSharedTreeResults<TSchema extends ImplicitFieldSchema> {
    /**
     * The Fluid `TreeView`.
     */
    treeView: TreeView<TSchema> | undefined;
    /**
     * The Fluid `SharedTree` object, should you want to use it directly.
     */
    sharedTree: ITree | undefined;
    /**
     * Root node
     */
    root: TreeFieldFromImplicitField<TSchema> | undefined;
}

/**
 * Return type of {@link useTreeNode} hook.
 */
export interface IUseTreeNodeResults<TNode = any> {
    /**
     * The Fluid `TreeNode`
     */
    node: TNode;
}

/**
 * Return type of {@link useLiveEvent} hook.
 */
export interface IUseLiveEventResults<TEvent = any> {
    /**
     * The most recent event that has been received in the session.
     */
    latestEvent: IReceiveLiveEvent<TEvent> | undefined;
    /**
     * All received events since initializing this component, sorted from oldest -> newest.
     */
    allEvents: IReceiveLiveEvent<TEvent>[];
    /**
     * Callback method to send a new event to users in the session.
     * @param TEvent to send.
     * @returns void promise that will throw when user does not have required roles
     */
    sendEvent: SendLiveEventAction<TEvent>;
    /**
     * The `LiveEvent` object, should you want to use it directly.
     */
    liveEvent: LiveEvent | undefined;
}

/**
 * Return type of {@link useLiveTimer} hook.
 */
export interface IUseLiveTimerResults {
    /**
     * The current timer configuration.
     */
    timerConfig: ITimerConfig | undefined;
    /**
     * The time remaining in milliseconds.
     */
    milliRemaining: number | undefined;
    /**
     * The `LiveTimer` object, should you want to use it directly.
     */
    liveTimer: LiveTimer | undefined;
    /**
     * Callback to send event through `LiveTimer`
     * @param duration the duration for the timer in milliseconds
     * @returns void promise that will throw when user does not have required roles
     */
    start: OnStartTimerAction;
    /**
     * Callback to send event through `LiveTimer`
     * @returns void promise that will throw when user does not have required roles
     */
    play: OnPlayTimerAction;
    /**
     * Callback to send event through `LiveTimer`
     * @returns void promise that will throw when user does not have required roles
     */
    pause: OnPauseTimerAction;
}

/**
 * Return type of {@link useLivePresence} hook.
 */
export interface IUseLivePresenceResults<TData extends LivePresenceData = any> {
    /**
     * The local user's presence object.
     */
    localUser: LivePresenceUser<TData> | undefined;
    /**
     * List of non-local user's presence objects.
     */
    otherUsers: LivePresenceUser<TData>[];
    /**
     * List of all online users.
     */
    onlineUsers: LivePresenceUser<TData>[];
    /**
     * List of all user's presence objects.
     */
    allUsers: LivePresenceUser<TData>[];
    /**
     * Live Share `LivePresence` object, should you want to use it directly.
     */
    livePresence: LivePresence<TData> | undefined;
    /**
     * Callback method to update the local user's presence.
     * @param data TData to set for user.
     * @returns void promise that will throw when user does not have required roles
     */
    updatePresence: OnUpdateLivePresenceAction<TData>;
}

/**
 * Return type of {@link useMediaSynchronizer} hook.
 */
export interface IUseMediaSynchronizerResults {
    /**
     * Stateful boolean on whether the session has an active suspension.
     */
    suspended: boolean;
    /**
     * Callback to initiate a play action for the group media session.
     * @returns void promise that will throw when user does not have required roles
     */
    play: () => Promise<void>;
    /**
     * Callback to initiate a pause action for the group media session.
     * @returns void promise that will throw when user does not have required roles
     */
    pause: () => Promise<void>;
    /**
     * Callback to initiate a seek action for the group media session.
     * @param time timestamp of the video in seconds to seek to
     * @returns void promise that will throw when user does not have required roles
     */
    seekTo: (time: number) => Promise<void>;
    /**
     * Callback to change the track for the group media session.
     * @param track media metadata object, track src string, or null
     * @returns void promise that will throw when user does not have required roles
     */
    setTrack: (
        track: Partial<ExtendedMediaMetadata> | string | null
    ) => Promise<void>;
    /**
     * Begin a new suspension. If a wait point is not set, the suspension will only impact the
     * local user.
     *
     * @param waitPoint Optional. Point in track to set the suspension at.
     * @see CoordinationWaitPoint
     */
    beginSuspension: (waitPoint?: CoordinationWaitPoint) => void;
    /**
     * End the currently active exception.
     */
    endSuspension: () => void;
    /**
     * Live Share `MediaPlayerSynchronizer` object, should you want to use it directly.
     */
    mediaSynchronizer: MediaPlayerSynchronizer | undefined;
}

/**
 * Return type of {@link useLiveCanvas} hook.
 */
export interface IUseLiveCanvasResults {
    /**
     * Inking manager for the canvas, which is synchronized by `liveCanvas`. It is set when loaded and undefined while loading.
     */
    inkingManager: InkingManager | undefined;
    /**
     * Live Canvas data object which synchronizes inking & cursors in the session. It is set when loaded and undefined while loading.
     */
    liveCanvas: LiveCanvas | undefined;
}

/**
 * Return type of {@link useLiveFollowMode} hook.
 */
export interface IUseLiveFollowModeResults<TData = any> {
    /**
     * Gets the current follow mode state.
     */
    state: IFollowModeState<TData> | undefined;
    /**
     * Local LivePresenceUser.
     */
    localUser: FollowModePresenceUser<TData> | undefined;
    /**
     * List of non-local user's presence objects.
     */
    otherUsers: FollowModePresenceUser<TData>[];
    /**
     * List of all user's presence objects.
     */
    allUsers: FollowModePresenceUser<TData>[];
    /**
     * LiveFollowMode DDS
     */
    liveFollowMode: LiveFollowMode<TData> | undefined;
    /**
     * Broadcast a new custom data value for the local user's current state.
     *
     * @remarks
     * Each user has their own state value, though it will differ from what is shown in {@link state} depending on the value of {@link FollowModeType}.
     * Will cause the user to become out of sync if another user is presenting or the local user is following another user.
     * To see each user's state, use the {@link getUsers} API, or listen to "presenceChanged" updates.
     *
     * @param newValue the state value for the local user's presence record.
     *
     * @returns a void promise that resolves once the update event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     */
    update: (stateValue: TData) => Promise<void>;
    /**
     * Start presenting the local user's state.
     *
     * @remarks
     * If another user is already presenting, the local user will take control of presenting from the previous presenter.
     * To update the local user's state that both the local and remote users will reference, use the {@link update} function.
     * This API will override any `followingUserId` value that was set through {@link followUser} until presenting has stopped.
     * To stop presenting, use the {@link stopPresenting} API.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user is already the presenter.
     * @throws error if the local user does not have the required roles to present.
     */
    startPresenting: () => Promise<void>;
    /**
     * Stop presenting the presenting user's current state.
     *
     * @remarks
     * This API allows any user with valid roles to cancel presenting, though we generally recommend only allowing the active presenter to do so.
     * To start presenting, use the {@link startPresenting} API.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles to stop presenting.
     */
    stopPresenting: () => Promise<void>;
    /**
     * Temporarily stop following presenter/follower.
     *
     * @returns a void promise once the operation succeeds.
     *
     * @throws error if initialization has not yet succeeded.
     */
    beginSuspension: () => Promise<void>;
    /**
     * Resume following presenter/follower.
     *
     * @returns a void promise once the operation succeeds.
     *
     * @throws error if initialization has not yet succeeded.
     */
    endSuspension: () => Promise<void>;
    /**
     * Follows another user in the session.
     *
     * @remarks
     * If another user is presenting, {@link state} will not reflect following this user until there is no longer a presenter.
     *
     * @param userId the userId for the user to follow.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if attempting to follow a user that is not recognized by this object's `LivePresence` instance.
     * @throws error if the `userId` provided is equal to the local user's `userId`.
     */
    followUser: (userId: string) => Promise<void>;
    /**
     * Stop following the currently following user.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the user is not already following another user.
     */
    stopFollowing: () => Promise<void>;
}
