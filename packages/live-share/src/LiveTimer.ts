/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory } from "@fluidframework/aqueduct";
import { LiveEventScope } from "./LiveEventScope";
import { LiveEventTarget } from "./LiveEventTarget";
import { LiveObjectSynchronizer } from "./LiveObjectSynchronizer";
import { IClientTimestamp, ILiveEvent, UserMeetingRole } from "./interfaces";
import { IEvent } from "@fluidframework/common-definitions";
import { cloneValue } from "./internals/utils";
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

interface IPlayEvent {
    duration: number;
    position: number;
}
type PlayEventReceived = ILiveEvent<IPlayEvent>;

interface IPauseEvent {
    duration: number;
    position: number;
}
type PauseEventReceived = ILiveEvent<IPauseEvent>;

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
     * Returns true if the object has been initialized.
     */
    public get isInitialized(): boolean {
        return !!this._synchronizer;
    }

    /**
     * @deprecated isInitialized should be used instead
     * Returns true if the object has been initialized.
     */
    public get isStarted(): boolean {
        return this.isInitialized;
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
        return this._tickRate;
    }

    public set tickRate(value: number) {
        this._tickRate = value;
    }

    /**
     * Initializes the object and starts listening for remote changes
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     */
    public async initialize(allowedRoles?: UserMeetingRole[]): Promise<void> {
        if (this.isInitialized) {
            throw new Error(`LiveTimer already started.`);
        }

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer<ITimerConfigData>(
            this.id,
            this.runtime,
            this.liveRuntime
        );
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
        // Get the initial remote state, if there is any
        const events = this._synchronizer.getEvents();
        if (!events) return;
        for (let eIndex = 0; eIndex < events.length; eIndex++) {
            const event = events[eIndex];
            const didApply = await this.remoteConfigReceived(
                {
                    ...event,
                    clientId: event.clientId,
                },
                event.clientId
            );
            if (didApply) break;
        }
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
     * @param duration in Milliseconds
     */
    public async start(duration: number): Promise<void> {
        if (!this.isInitialized) {
            throw new Error(`LiveTimer not started.`);
        }

        await this.playInternal(duration, 0);
    }

    /**
     * Resumes the timer.
     *
     * @remarks
     * Playing an already playing timer does nothing.
     */
    public async play(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error(`LiveTimer not started.`);
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
     */
    public async pause(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error(`LiveTimer not started.`);
        }

        if (this._currentConfig.data.running) {
            // Broadcast state change
            const event: ITimerConfigEvent = {
                timestamp: this.liveRuntime.getTimestamp(),
                clientId: await this.waitUntilConnected(),
                data: {
                    duration: this._currentConfig.data.duration,
                    position:
                        this._currentConfig.data.position +
                        (this.liveRuntime.getTimestamp() -
                            this._currentConfig.timestamp),
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
        function endTimeFromConfig(config: ITimerConfigEvent): number {
            return (
                config.timestamp - config.data.position + config.data.duration
            );
        }
        const tickCallback = () => {
            if (this._currentConfig.data.running) {
                const timestamp = this.liveRuntime.getTimestamp();
                const endTime = endTimeFromConfig(this._currentConfig);
                if (timestamp >= endTime) {
                    const newConfig: ITimerConfigEvent = {
                        timestamp,
                        clientId: this._currentConfig.clientId,
                        data: {
                            duration: this._currentConfig.data.duration,
                            position: this._currentConfig.data.duration,
                            running: false,
                        },
                    };
                    this.updateConfig(newConfig, true).catch((err) => {
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
}

/**
 * Register `LiveTimer` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LiveTimer, LiveTimer.TypeName);
