/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import React from "react";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { LoadableObjectClass } from "fluid-framework";
import { ITimerConfig, ILiveEvent, PresenceState } from "@microsoft/live-share";

// React actions

export type SetSharedStateAction<T> = (state: T) => void;
export type SetLocalStateAction = React.Dispatch<React.SetStateAction<any>>;

// Fluid actions

/**
 * Callback for UnregisterDDSSetStateAction.
 * <T extends IFluidLoadable>(uniqueKey: string, componentId: string, objectClass: LoadableObjectClass<T>, setLocalStateAction: SetLocalStateAction, onDidFirstInitialize?: (dds: T) => void) => void
 */
export type RegisterDDSSetStateAction = <T extends IFluidLoadable>(
    uniqueKey: string,
    componentId: string,
    objectClass: LoadableObjectClass<T>,
    setLocalStateAction: SetLocalStateAction,
    onDidFirstInitialize?: (dds: T) => void
) => void;

/**
 * Callback for UnregisterDDSSetStateAction.
 * (uniqueKey: string, componentId: string) => void
 */
export type UnregisterDDSSetStateAction = (
    uniqueKey: string,
    componentId: string
) => void;

/**
 * Callback for RegisterSharedSetStateAction.
 * (uniqueKey: string, componentId: string, setLocalStateAction: SetLocalStateAction) => void
 */
export type RegisterSharedSetStateAction = (
    uniqueKey: string,
    componentId: string,
    setLocalStateAction: SetLocalStateAction
) => void;

/**
 * Callback for UnregisterSharedSetStateAction.
 * (uniqueKey: string, componentId: string) => void
 */
export type UnregisterSharedSetStateAction = (
    uniqueKey: string,
    componentId: string
) => void;

/**
 * Callback for UpdateSharedStateAction.
 * (uniqueKey: string, value: any) => void
 */
export type UpdateSharedStateAction = (uniqueKey: string, value: any) => void;

/**
 * Callback for DeleteSharedStateAction.
 * (uniqueKey: string) => void
 */
export type DeleteSharedStateAction = (uniqueKey: string) => void;
/**
 * Callback for DisposeSharedStateAction.
 * () => void
 */
export type DisposeSharedStateAction = () => void;

// Live Share actions

/**
 * Callback for SetLiveStateAction<TState = undefined>.
 * (state: TState) => Promise<void>
 */
export type SetLiveStateAction<TState = undefined> = (
    state: TState
) => Promise<void>;

/**
 * Callback for SendLiveEventAction<TEvent>.
 * (event: TEvent) => Promise<void>
 */
export type SendLiveEventAction<TEvent> = (
    event: TEvent
) => Promise<ILiveEvent<TEvent>>;

/**
 * Callback for OnReceivedLiveEventAction<TEvent>.
 * (event: TEvent, local: boolean) => void
 */
export type OnReceivedLiveEventAction<TEvent> = (
    event: TEvent,
    local: boolean
) => void;

/**
 * Callback for OnUpdateLivePresenceAction<TData extends object = object>.
 * (data?: TData | undefined, state?: PresenceState | undefined) => Promise<void>
 */
export type OnUpdateLivePresenceAction<TData extends object = object> = (
    data?: TData | undefined,
    state?: PresenceState | undefined
) => Promise<void>;

/**
 * Callback for OnStartTimerAction.
 * (duration: number) => Promise<void>
 */
export type OnStartTimerAction = (duration: number) => Promise<void>;

/**
 * Callback for OnPlayTimerAction.
 * () => Promise<void>
 */
export type OnPlayTimerAction = () => Promise<void>;

/**
 * Callback for OnPauseTimerAction.
 * () => Promise<void>
 */
export type OnPauseTimerAction = () => Promise<void>;

/**
 * Callback for OnTimerTickAction.
 * (milliRemaining: number) => void
 */
export type OnTimerTickAction = (milliRemaining: number) => void;
/**
 * Callback for OnTimerDidStartAction.
 * (timerConfig: ITimerConfig) => void
 */
export type OnTimerDidStartAction = (timerConfig: ITimerConfig) => void;
/**
 * Callback for OnTimerDidPauseAction.
 * (timerConfig: ITimerConfig) => void
 */
export type OnTimerDidPauseAction = (timerConfig: ITimerConfig) => void;
/**
 * Callback for OnTimerDidPlayAction.
 * (timerConfig: ITimerConfig) => void
 */
export type OnTimerDidPlayAction = (timerConfig: ITimerConfig) => void;
/**
 * Callback for OnTimerDidFinishAction.
 * (timerConfig: ITimerConfig) => void
 */
export type OnTimerDidFinishAction = (timerConfig: ITimerConfig) => void;
