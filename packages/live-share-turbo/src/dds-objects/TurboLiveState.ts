/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveStateEvents, LiveState, UserMeetingRole, LiveStateEvents } from "@microsoft/live-share";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces";
import { TurboDataObject } from "./TurboDataObject";

export class TurboLiveState<TData = undefined> extends TurboDataObject<
    ILiveStateEvents<TData>,
    LiveState<TData>
> {
    private _isInitialized: boolean = false;
    private _allowedRoles?: UserMeetingRole[];

    constructor(dataObject: LiveState<TData>) {
        const onDidOverrideDataObject = async () => {
            if (this._isInitialized) {
                try {
                    await this.dataObject.initialize(this._allowedRoles);
                } catch (error: any) {
                    console.error(error);
                }
            }
        };
        super(dataObject, Object.keys(LiveStateEvents), onDidOverrideDataObject);
    }

    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Optional data object for the current state.
     */
    public get data(): TData | undefined {
        return this.dataObject.data;
    }

    /**
     * The current state.
     */
    public get state(): string {
        return this.dataObject.state;
    }

    /**
     * initialize the object.
     * @param allowedRoles Optional. List of roles allowed to send events.
     */
    public async initialize(allowedRoles?: UserMeetingRole[], state?: string, data?: TData): Promise<void> {
        await this.dataObject.initialize(allowedRoles, state, data);
        this._allowedRoles = allowedRoles;
        this._isInitialized = true;
    }

    /**
     * Changes to a new state with an optional data object.
     * @param state New state name.
     * @param data Optional. Data object to associate with the new state.
     */
    public changeState(state: string, data?: TData): void {
        return this.dataObject.changeState(state, data);
    }

    public static async create<TData = undefined>(
        turboClient: IFluidTurboClient,
        objectKey: string,
        onDidFirstInitialize?: (dds: TurboLiveState<TData>) => void
    ): Promise<TurboLiveState<TData>> {
        const results = await turboClient.getDDS<
            ILiveStateEvents<TData>,
            LiveState<TData>
        >(
            objectKey,
            LiveState<TData>,
            (dds: IFluidLoadable): TurboLiveState<TData> => {
                return new TurboLiveState(dds as LiveState<TData>);
            }
        );
        const dds = results.dds as TurboLiveState<TData>;
        if (results.created) {
            onDidFirstInitialize?.(dds);
        }
        return dds;
    }
}
