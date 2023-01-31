/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveEvent, ILiveEventEvents, LiveEvent, UserMeetingRole, LiveEventEvents } from "@microsoft/live-share";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces";
import { TurboDataObject } from "./TurboDataObject";

export class TurboLiveEvent<
    TEvent extends ILiveEvent = ILiveEvent
> extends TurboDataObject<
    ILiveEventEvents<TEvent>,
    LiveEvent<TEvent>
> {
    private _isInitialized: boolean = false;
    private _allowedRoles?: UserMeetingRole[];

    constructor(dataObject: LiveEvent<TEvent>) {
        const onDidOverrideDataObject = async () => {
            if (this._isInitialized) {
                try {
                    await this.dataObject.initialize(this._allowedRoles);
                } catch (error: any) {
                    console.error(error);
                }
            }
        };
        super(dataObject, Object.keys(LiveEventEvents), onDidOverrideDataObject);
    }

    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * initialize the object.
     * @param allowedRoles Optional. List of roles allowed to send events.
     */
    public async initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        await this.dataObject.initialize(allowedRoles);
        this._allowedRoles = allowedRoles;
        this._isInitialized = true;
    }

    /**
     * Broadcasts an event to all other clients.
     *
     * @remarks
     * The event will be queued for delivery if the client isn't currently connected.
     * @param evt Optional. Event to send. If omitted, an event will still be sent but it won't
     * include any custom event data.
     * @returns The full event object that was sent, including the timestamp of when the event
     * was sent and the clientId if known. The clientId will be `undefined` if the client is
     * disconnected at time of delivery.
     */
    public sendEvent(evt?: Partial<TEvent>): TEvent {
        return this.dataObject.sendEvent(evt);
    }

    public static async create<TEvent extends ILiveEvent = ILiveEvent>(
        turboClient: IFluidTurboClient,
        objectKey: string,
        onDidFirstInitialize?: (dds: TurboLiveEvent<TEvent>) => void
    ): Promise<TurboLiveEvent<TEvent>> {
        const results = await turboClient.getDDS<
            ILiveEventEvents<TEvent>,
            LiveEvent<TEvent>
        >(
            objectKey,
            LiveEvent<TEvent>,
            (dds: IFluidLoadable): TurboLiveEvent<TEvent> => {
                return new TurboLiveEvent(dds as LiveEvent<TEvent>);
            }
        );
        const dds = results.dds as TurboLiveEvent<TEvent>;
        if (results.created) {
            onDidFirstInitialize?.(dds);
        }
        return dds;
    }
}
