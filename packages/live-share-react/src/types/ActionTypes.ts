/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import React from "react";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { LoadableObjectClass } from "fluid-framework";
import { ITimerConfig, PresenceState } from "@microsoft/live-share";

// React actions
export type SetSharedStateAction<T> = (state: T) => void;
export type SetLocalStateAction = React.Dispatch<React.SetStateAction<any>>;

// Fluid actions
export type RegisterDDSSetStateAction = <T extends IFluidLoadable>(
    uniqueKey: string,
    componentId: string,
    objectClass: LoadableObjectClass<T>,
    setLocalStateAction: SetLocalStateAction,
    onDidFirstInitialize?: (dds: T) => void
) => void;

export type UnregisterDDSSetStateAction = (
    uniqueKey: string,
    componentId: string
) => void;

export type RegisterSharedSetStateAction = (
    uniqueKey: string,
    componentId: string,
    setLocalStateAction: SetLocalStateAction
) => void;

export type UnregisterSharedSetStateAction = (
    uniqueKey: string,
    componentId: string
) => void;

export type UpdateSharedStateAction = (uniqueKey: string, value: any) => void;

export type DeleteSharedStateAction = (uniqueKey: string) => void;
export type DisposeSharedStateAction = () => void;

// Live Share actions

export type SetLiveStateAction<TState, TData> = (
    state: TState,
    value?: TData | undefined
) => void;

export type SendLiveEventAction<TEvent> = (event: TEvent) => void;

export type OnReceivedLiveEventAction<TEvent> = (
    event: TEvent,
    local: boolean
) => void;

export type OnUpdateLivePresenceAction<TData extends object = object> = (
    state?: PresenceState | undefined,
    data?: TData | undefined
) => void;

export type OnStartTimerAction = (
    duration: number
) => void;

export type OnPlayTimerAction = () => void;

export type OnPauseTimerAction = () => void;

export type OnTimerTickAction = (milliRemaining: number) => void;
export type OnTimerDidStartAction = (timerConfig: ITimerConfig) => void;
export type OnTimerDidPauseAction = (timerConfig: ITimerConfig) => void;
export type OnTimerDidPlayAction = (timerConfig: ITimerConfig) => void;
export type OnTimerDidFinishAction = (timerConfig: ITimerConfig) => void;

export type OnAIChangePromptAction = (promptValue: string) => void;
export type OnAIChangeCompletionAction = () => Promise<{
    completionValue: string;
    referenceId: string;
}>;
