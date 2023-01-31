/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveTimerEvents, LiveTimer, UserMeetingRole, LiveTimerEvents } from "@microsoft/live-share";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces";
import { TurboDataObject } from "./TurboDataObject";

export class TurboLiveTimer extends TurboDataObject<
    ILiveTimerEvents,
    LiveTimer
> {
    private _isInitialized: boolean = false;
    private _allowedRoles?: UserMeetingRole[];

    constructor(dataObject: LiveTimer) {
        const onDidOverrideDataObject = async () => {
            if (this._isInitialized) {
                try {
                    this.dataObject.initialize(this._allowedRoles);
                } catch (error: any) {
                    console.error(error);
                }
            }
        };
        super(dataObject, Object.keys(LiveTimerEvents), onDidOverrideDataObject);
    }

    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Tick rate for timer in milliseconds. The default tick rate is 20 milliseconds
     *
     * @remarks
     * Tick rate is used to evaluate how often onTick callback is called.
     * A high tick rate can also result in the started, played, paused, and finished
     * callbacks being called slightly later.
     *
     * If the tick rate is the default tick rate or lower, timer will tick
     * at the framerate of the browser.
     */
    public get tickRate(): number {
        return this.dataObject.tickRate;
    }

    public set tickRate(value: number) {
        this.dataObject.tickRate = value;
    }

    /**
     * initialize the object.
     * @param allowedRoles Optional. List of roles allowed to send events.
     */
    public async initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        this.dataObject.initialize(allowedRoles);
        this._allowedRoles = allowedRoles;
        this._isInitialized = true;
    }

    /**
     * Starts the timer with a specified duration.
     *
     * @remarks
     * Starting an already started timer will restart the timer with a new duration.
     * @param duration in Milliseconds
     */
    public start(duration: number): void {
        return this.dataObject.start(duration);
    }

    /**
     * Resumes the timer.
     *
     * @remarks
     * Playing an already playing timer does nothing.
     */
    public play(): void {
        return this.dataObject.play();
    }

    /**
     * Pauses the timer.
     *
     * @remarks
     * Pausing an already paused timer does nothing.
     */
    public pause(): void {
        return this.dataObject.pause();
    }

    public static async create(
        turboClient: IFluidTurboClient,
        objectKey: string,
        onDidFirstInitialize?: (dds: TurboLiveTimer) => void
    ): Promise<TurboLiveTimer> {
        const results = await turboClient.getDDS<
            ILiveTimerEvents,
            LiveTimer
        >(
            objectKey,
            LiveTimer,
            (dds: IFluidLoadable): TurboLiveTimer => {
                return new TurboLiveTimer(dds as LiveTimer);
            }
        );
        const dds = results.dds as TurboLiveTimer;
        if (results.created) {
            onDidFirstInitialize?.(dds);
        }
        return dds;
    }
}
