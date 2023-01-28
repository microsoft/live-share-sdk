import React from "react";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { LoadableObjectClass } from "fluid-framework";
import { PresenceState } from "@microsoft/live-share";

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
