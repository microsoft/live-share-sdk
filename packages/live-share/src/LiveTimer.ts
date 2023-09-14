/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory } from "@fluidframework/aqueduct";
import { LiveObjectSynchronizer } from "./LiveObjectSynchronizer";
import {
    IClientTimestamp,
    ILiveEvent,
    LiveDataObjectInitializeState,
    UserMeetingRole,
} from "./interfaces";
import { IEvent } from "@fluidframework/common-definitions";
import { LiveEvent } from "./LiveEvent";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";
import { LiveDataObject } from "./LiveDataObject";

export interface ITimerConfigData {
    /**
     * Duration of timer
     */
    duration: number;
    /**
     * position when config change occurred
     */
    position: number;
    /**
     * Whether the timer was running or not when config change occurred
     */
    running: boolean;
}

export interface ITimerConfig extends ITimerConfigData {
    /**
     * Time the config changed at
     */
    configChangedAt: number;
    /**
     * The clientId that made the change
     */
    clientId: string;
}

type ITimerConfigEvent = Omit<ILiveEvent<ITimerConfigData>, "name">;

/**
 * Events supported by `LiveTimer` object.
 */
export enum LiveTimerEvents {
    /**
     * Timer has started
     */
    started = "started",

    /**
     * Paused timer has resumed
     */
    played = "played",

    /**
     * Playing timer has paused
     */
    paused = "paused",

    /**
     * Timer has finished
     */
    finished = "finished",

    /**
     * Timer has progressed
     */
    onTick = "onTick",
}

export interface ILiveTimerEvents extends IEvent {
    (
        event: "started",
        listener: (config: ITimerConfig, local: boolean) => void
    ): any;

    (
        event: "played",
        listener: (config: ITimerConfig, local: boolean) => void
    ): any;

    (
        event: "paused",
        listener: (config: ITimerConfig, local: boolean) => void
    ): any;

    (event: "finished", listener: (config: ITimerConfig) => void): any;

    (event: "onTick", listener: (milliRemaining: number) => void): any;
}

export class LiveTimer extends LiveDataObject<{
    Events: ILiveTimerEvents;
}> {
    private _currentConfig: ITimerConfigEvent = {
        clientId: "",
        timestamp: 0,
        data: {
            duration: 0,
            position: 0,
            running: false,
        },
    };
    private _synchronizer?: LiveObjectSynchronizer<ITimerConfigData>;
    private _defaultTickRate = 20;
    private _tickRate = this._defaultTickRate;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:LiveTimer`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveTimer.TypeName,
        LiveTimer,
        [],
        {}
    );

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
        return this._tickRate;
    }

    public set tickRate(value: number) {
        this._tickRate = value;
    }

    /**
     * Initialize the object to begin sending/receiving timer updates through this DDS.
     *
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     *
     * @returns a void promise that resolves once complete.
     *
     * @throws error when `.initialize()` has already been called for this class instance.
     * @throws fatal error when `.initialize()` has already been called for an object of same id but with a different class instance.
     * This is most common when using dynamic objects through Fluid.
     */
    public async initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.needed) {
            throw new Error(`LiveTimer already started.`);
        }
        // This error should not happen due to `initializeState` enum, but if it is somehow defined at this point, errors will occur.
        if (this._synchronizer) {
            throw new Error(
                `LiveTimer: _synchronizer already set, which is an unexpected error. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        // Update initialize state as pending
        this.initializeState = LiveDataObjectInitializeState.pending;

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer<ITimerConfigData>(
            this.id,
            this.runtime,
            this.liveRuntime
        );
        try {
            await this._synchronizer.start(
                this._currentConfig.data,
                async (state, sender) => {
                    // Check for state change.
                    // If it was valid, this will override the local user's previous value.
                    return await this.remoteConfigReceived(state, sender);
                },
                async (connecting) => {
                    if (connecting) return true;
                    // If user has eligible roles, allow the update to be sent
                    try {
                        return await this.verifyLocalUserRoles();
                    } catch {
                        return false;
                    }
                }
            );
        } catch (error: unknown) {
            // Update initialize state as fatal error
            this.initializeState = LiveDataObjectInitializeState.fatalError;
            throw error;
        }

        // Update initialize state as succeeded
        this.initializeState = LiveDataObjectInitializeState.succeeded;
    }

    /**
     * Disposes of the object when its container is disposed of.
     */
    public dispose(): void {
        super.dispose();
        if (this._synchronizer) {
            this._synchronizer.dispose();
        }
    }

    /**
     * Starts the timer with a specified duration.
     *
     * @remarks
     * Starting an already started timer will restart the timer with a new duration.
     *
     * @param duration in Milliseconds
     *
     * @returns a void promise that resolves once the start event has been sent to the server
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles defined through the `allowedRoles` prop in `.initialize()`.
     */
    public async start(duration: number): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveTimer: not initialized prior to calling \`.start()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }

        await this.playInternal(duration, 0);
    }

    /**
     * Resumes the timer.
     *
     * @remarks
     * Playing an already playing timer does nothing.
     *
     * @returns a void promise that resolves once the play event has been sent to the server
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles defined through the `allowedRoles` prop in `.initialize()`.
     */
    public async play(): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveTimer: not initialized prior to calling \`.play()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }

        if (
            !this._currentConfig.data.running &&
            this._currentConfig.data.position <
                this._currentConfig.data.duration
        ) {
            await this.playInternal(
                this._currentConfig.data.duration,
                this._currentConfig.data.position
            );
        }
    }

    private async playInternal(
        duration: number,
        position: number
    ): Promise<void> {
        // Broadcast state change
        const event: ITimerConfigEvent = {
            timestamp: this.liveRuntime.getTimestamp(),
            clientId: await this.waitUntilConnected(),
            data: {
                duration: duration,
                position: position,
                running: true,
            },
        };

        // Update local state immediately
        await this.updateConfig(event, true);
    }

    /**
     * Pauses the timer.
     *
     * @remarks
     * Pausing an already paused timer does nothing.
     *
     * @returns a void promise that resolves once the pause event has been sent to the server
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles defined through the `allowedRoles` prop in `.initialize()`.
     */
    public async pause(): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveTimer: not initialized prior to calling \`.pause()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }

        if (this._currentConfig.data.running) {
            // Broadcast state change
            const currentTime = this.liveRuntime.getTimestamp();
            const event: ITimerConfigEvent = {
                timestamp: currentTime,
                clientId: await this.waitUntilConnected(),
                data: {
                    duration: this._currentConfig.data.duration,
                    position:
                        this._currentConfig.data.position +
                        (currentTime - this._currentConfig.timestamp),
                    running: false,
                },
            };

            // Update local state immediately
            await this.updateConfig(event, true);
        }
    }

    private async remoteConfigReceived(
        config: ITimerConfigEvent,
        sender: string
    ): Promise<boolean> {
        try {
            const allowed = await this.liveRuntime.verifyRolesAllowed(
                sender,
                this._allowedRoles
            );
            // Ensure that state is allowed, newer, and not the initial state.
            const currentClientTimestamp: IClientTimestamp = {
                timestamp: this._currentConfig.timestamp,
                clientId: this._currentConfig.clientId,
            };

            const isConfigNewer = LiveEvent.isNewer(
                currentClientTimestamp,
                config
            );

            const currentTime = this.liveRuntime.getTimestamp();
            const endTime = this.endTimeFromConfig(config);
            if (
                allowed &&
                this._currentConfig.timestamp === 0 &&
                config.data.running === true &&
                currentTime >= endTime
            ) {
                // Since finish config changes are not sent through the Synchronizer only the most recent config before finish is saved.
                // For clients joining after the the timer has already finished, set the finish config.
                const finishedBeforeJoinConfig: ITimerConfigEvent = {
                    timestamp: endTime,
                    clientId: config.clientId,
                    data: {
                        duration: config.data.duration,
                        position: config.data.duration,
                        running: false,
                    },
                };
                this.updateConfig(finishedBeforeJoinConfig, false);
                return true;
            }

            if (
                JSON.stringify(this._currentConfig.data) ===
                    JSON.stringify(config.data) &&
                this._currentConfig.timestamp === config.timestamp
            )
                return false;

            if (allowed && isConfigNewer) {
                this.updateConfig(config, false);
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    }

    private async updateConfig(event: ITimerConfigEvent, local: boolean) {
        const userExposedConfig = {
            clientId: event.clientId,
            configChangedAt: event.timestamp,
            ...event.data,
        };
        this._currentConfig = event;

        if (event.data.position === 0) {
            this.emit(LiveTimerEvents.started, userExposedConfig, local);
        } else if (event.data.duration === event.data.position) {
            this.emit(LiveTimerEvents.finished, userExposedConfig);
        } else if (event.data.running) {
            this.emit(LiveTimerEvents.played, userExposedConfig, local);
        } else {
            this.emit(LiveTimerEvents.paused, userExposedConfig, local);
        }

        if (event.data.running) {
            this.startTicking();
        }
        if (local) {
            return await this._synchronizer!.sendEvent(event.data);
        }
    }

    private startTicking() {
        const tickCallback = () => {
            if (this._currentConfig.data.running) {
                const timestamp = this.liveRuntime.getTimestamp();
                const endTime = this.endTimeFromConfig(this._currentConfig);
                if (timestamp >= endTime) {
                    const newConfig: ITimerConfigEvent = {
                        timestamp: endTime,
                        clientId: this._currentConfig.clientId,
                        data: {
                            duration: this._currentConfig.data.duration,
                            position: this._currentConfig.data.duration,
                            running: false,
                        },
                    };
                    // Set local to false for this config update.
                    // Every client is expected to set the finish config locally for themselves at the same time.
                    // We do not want a bunch of duplicate synchronizer finish events to go out at the exact same time for every client.
                    this.updateConfig(newConfig, false).catch((err) => {
                        console.error(err);
                    });
                } else {
                    this.emit(LiveTimerEvents.onTick, endTime - timestamp);
                    this.scheduleAnimationFrame(tickCallback);
                }
            }
        };
        this.scheduleAnimationFrame(tickCallback);
    }

    private scheduleAnimationFrame(callback: FrameRequestCallback): void {
        if (
            this._tickRate <= this._defaultTickRate &&
            typeof requestAnimationFrame == "function"
        ) {
            requestAnimationFrame(callback);
        } else {
            setTimeout(callback, this._tickRate);
        }
    }

    private endTimeFromConfig(config: ITimerConfigEvent): number {
        return config.timestamp - config.data.position + config.data.duration;
    }
}

/**
 * Register `LiveTimer` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LiveTimer, LiveTimer.TypeName);
