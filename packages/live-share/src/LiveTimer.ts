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

export interface ITimerConfig {
    /**
     * Time the config changed at
     */
    configChangedAt: number;
    /**
     * The clientId that made the change
     */
    clientId: string;
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
    private _currentConfig: ITimerConfig = {
        clientId: "",
        configChangedAt: 0,
        duration: 0,
        position: 0,
        running: false,
    };

    private _scope?: LiveEventScope;
    private _playEvent?: LiveEventTarget<IPlayEvent>;
    private _pauseEvent?: LiveEventTarget<IPauseEvent>;
    private _synchronizer?: LiveObjectSynchronizer<ITimerConfig>;
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
        return !!this._scope;
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
        if (this._scope) {
            throw new Error(`LiveTimer already started.`);
        }

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create event scope
        this._scope = new LiveEventScope(
            this.runtime,
            this.liveRuntime,
            allowedRoles
        );

        // TODO: make enum for event type names
        this._playEvent = new LiveEventTarget(
            this._scope,
            "Play",
            (event, local) => this._handlePlay(event, local)
        );
        this._pauseEvent = new LiveEventTarget(
            this._scope,
            "Pause",
            (event, local) => this._handlePause(event, local)
        );

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer<ITimerConfig>(
            this.id,
            this.runtime,
            this.liveRuntime
        );
        await this._synchronizer.start(
            this._currentConfig,
            async (state, sender) => {
                // Check for state change.
                // If it was valid, this will override the local user's previous value.
                return await this.remoteConfigReceived(
                    {
                        ...state.data,
                        clientId: sender,
                    },
                    sender
                );
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
                    ...event.data,
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
        if (!this._scope) {
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
        if (!this._scope) {
            throw new Error(`LiveTimer not started.`);
        }

        if (
            !this._currentConfig.running &&
            this._currentConfig.position < this._currentConfig.duration
        ) {
            await this.playInternal(
                this._currentConfig.duration,
                this._currentConfig.position
            );
        }
    }

    private async playInternal(
        duration: number,
        position: number
    ): Promise<void> {
        // Broadcast state change
        const event: PlayEventReceived = await this._playEvent!.sendEvent({
            duration: duration,
            position: position,
        });

        // Update local state immediately
        await this.updateConfig(this.playEventToConfig(event), true);
    }

    /**
     * Pauses the timer.
     *
     * @remarks
     * Pausing an already paused timer does nothing.
     */
    public async pause(): Promise<void> {
        if (!this._scope) {
            throw new Error(`LiveTimer not started.`);
        }

        if (this._currentConfig.running) {
            // Broadcast state change
            const event = await this._pauseEvent!.sendEvent({
                duration: this._currentConfig.duration,
                position:
                    this._currentConfig.position +
                    (this.liveRuntime.getTimestamp() -
                        this._currentConfig.configChangedAt),
            });

            // Update local state immediately
            await this.updateConfig(this.pauseEventToConfig(event), true);
        }
    }

    private _handlePlay(event: PlayEventReceived, local: boolean) {
        if (!local) {
            const newConfig = this.playEventToConfig(event);
            this.remoteConfigReceived(newConfig, event.clientId).catch((err) =>
                console.error(err)
            );
        }
    }

    private _handlePause(event: PauseEventReceived, local: boolean) {
        if (!local) {
            const newConfig = this.pauseEventToConfig(event);
            this.remoteConfigReceived(newConfig, event.clientId).catch((err) =>
                console.error(err)
            );
        }
    }

    private async remoteConfigReceived(
        config: ITimerConfig,
        sender: string
    ): Promise<boolean> {
        try {
            const allowed = await this.liveRuntime.verifyRolesAllowed(
                sender,
                this._allowedRoles
            );
            // Ensure that state is allowed, newer, and not the initial state.
            const currentClientTimestamp: IClientTimestamp = {
                timestamp: this._currentConfig.configChangedAt,
                clientId: this._currentConfig.clientId,
            };

            const newClientTimestamp: IClientTimestamp = {
                timestamp: config.configChangedAt,
                clientId: sender,
            };

            const isConfigNewer = LiveEvent.isNewer(
                currentClientTimestamp,
                newClientTimestamp
            );

            if (allowed && isConfigNewer) {
                config.clientId = sender;
                this.updateConfig(config, false);
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    }

    private async updateConfig(config: ITimerConfig, local: boolean) {
        const userExposedConfig = cloneValue(config);
        this._currentConfig = userExposedConfig;

        if (config.position === 0) {
            this.emit(LiveTimerEvents.started, userExposedConfig, local);
        } else if (config.duration === config.position) {
            this.emit(LiveTimerEvents.finished, userExposedConfig);
        } else if (config.running) {
            this.emit(LiveTimerEvents.played, userExposedConfig, local);
        } else {
            this.emit(LiveTimerEvents.paused, userExposedConfig, local);
        }

        if (userExposedConfig.running) {
            this.startTicking();
        }
        if (local) {
            return await this._synchronizer!.sendEvent(config);
        }
    }

    private playEventToConfig(event: PlayEventReceived): ITimerConfig {
        const newConfig: ITimerConfig = {
            configChangedAt: event.timestamp,
            clientId: event.clientId,
            duration: event.data.duration,
            position: event.data.position,
            running: true,
        };
        return newConfig;
    }

    private pauseEventToConfig(event: PauseEventReceived): ITimerConfig {
        const newConfig: ITimerConfig = {
            configChangedAt: event.timestamp,
            clientId: event.clientId,
            duration: event.data.duration,
            position: event.data.position,
            running: false,
        };
        return newConfig;
    }

    private startTicking() {
        function endTimeFromConfig(config: ITimerConfig): number {
            return config.configChangedAt - config.position + config.duration;
        }
        const tickCallback = () => {
            if (this._currentConfig.running) {
                const timestamp = this.liveRuntime.getTimestamp();
                const endTime = endTimeFromConfig(this._currentConfig);
                if (timestamp >= endTime) {
                    const newConfig: ITimerConfig = {
                        configChangedAt: timestamp,
                        clientId: this._currentConfig.clientId,
                        duration: this._currentConfig.duration,
                        position: this._currentConfig.duration,
                        running: false,
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
