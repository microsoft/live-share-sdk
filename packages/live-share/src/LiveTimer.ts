/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { LiveEventScope } from "./LiveEventScope";
import { LiveEventTarget } from "./LiveEventTarget";
import { LiveObjectSynchronizer } from "./LiveObjectSynchronizer";
import { IClientTimestamp, ILiveEvent, UserMeetingRole } from "./interfaces";
import { IEvent } from "@fluidframework/common-definitions";
import { cloneValue } from "./internals/utils";
import { LiveEvent } from "./LiveEvent";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";

/** for all time values millis from epoch is used */
export interface ITimerConfig {
    configChangedAt: number;
    clientId: string;
    duration: number;
    // position when config change occured
    position: number;
    // running or not when config change occured
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

interface IPlayEvent extends ILiveEvent {
    duration: number;
    position: number;
}

interface IPauseEvent extends ILiveEvent {
    duration: number;
    position: number;
}

export class LiveTimer extends DataObject<{
    Events: ILiveTimerEvents;
}> {
    private _allowedRoles: UserMeetingRole[] = [];
    private _currentConfig: ITimerConfig = {
        configChangedAt: 0,
        clientId: "",
        duration: 0,
        position: 0,
        running: false,
    } as ITimerConfig;

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
     * initalizes the object.
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     */
    // TODO: should this be an async method and wait till connected like LivePresence?
    public initialize(allowedRoles?: UserMeetingRole[]): void {
        if (this._scope) {
            throw new Error(`LiveTimer already started.`);
        }

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create event scope
        this._scope = new LiveEventScope(this.runtime, allowedRoles);

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
            this.context.containerRuntime,
            (connecting) => {
                // Return current state
                return this._currentConfig;
            },
            (connecting, state, sender) => {
                // Check for state change
                this.remoteConfigReceived(state!, sender);
            }
        );
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
    public start(duration: number): void {
        if (!this._scope) {
            throw new Error(`LiveTimer not started.`);
        }

        this.playInternal(duration, 0);
    }

    /**
     * Resumes the timer.
     *
     * @remarks
     * Playing an already playing timer does nothing.
     */
    public play(): void {
        if (!this._scope) {
            throw new Error(`LiveTimer not started.`);
        }

        if (
            !this._currentConfig.running &&
            this._currentConfig.position < this._currentConfig.duration
        ) {
            this.playInternal(
                this._currentConfig.duration,
                this._currentConfig.position
            );
        }
    }

    private playInternal(duration: number, position: number): void {
        // Broadcast state change
        const event: IPlayEvent = this._playEvent!.sendEvent({
            duration: duration,
            position: position,
        });

        // Update local state immediately
        this.updateConfig(this.playEventToConfig(event), true);
    }

    /**
     * Pauses the timer.
     *
     * @remarks
     * Pausing an already paused timer does nothing.
     */
    public pause(): void {
        if (!this._scope) {
            throw new Error(`LiveTimer not started.`);
        }

        if (this._currentConfig.running) {
            // Broadcast state change
            const event = this._pauseEvent!.sendEvent({
                duration: this._currentConfig.duration,
                position:
                    this._currentConfig.position +
                    (LiveEvent.getTimestamp() -
                        this._currentConfig.configChangedAt),
            });

            // Update local state immediately
            this.updateConfig(this.pauseEventToConfig(event), true);
        }
    }

    private _handlePlay(event: IPlayEvent, local: boolean) {
        if (!local) {
            const newConfig = this.playEventToConfig(event);
            this.remoteConfigReceived(newConfig, event.clientId!);
        }
    }

    private _handlePause(event: IPauseEvent, local: boolean) {
        if (!local) {
            const newConfig = this.pauseEventToConfig(event);
            this.remoteConfigReceived(newConfig, event.clientId!);
        }
    }

    private remoteConfigReceived(config: ITimerConfig, sender: string): void {
        LiveEvent.verifyRolesAllowed(sender, this._allowedRoles)
            .then((allowed) => {
                // Ensure that state is allowed, newer, and not the initial state.
                const currentClientTimestamp: IClientTimestamp = {
                    timestamp: this._currentConfig.configChangedAt,
                    clientId: this._currentConfig.clientId,
                };

                const newClientTimestamp: IClientTimestamp = {
                    timestamp: config.configChangedAt,
                    clientId: config.clientId,
                };

                const isConfigNewer = LiveEvent.isNewer(
                    currentClientTimestamp,
                    newClientTimestamp
                );

                if (allowed && isConfigNewer && config.clientId) {
                    this.updateConfig(config, false);
                }
            })
            .catch((err) => {
                console.error(err);
            });
    }

    private updateConfig(config: ITimerConfig, local: boolean) {
        const clone = cloneValue(config)!;
        this._currentConfig = clone;

        // TODO: do we need to clone this one?
        const userExposedConfig = cloneValue(clone);
        if (config.position === 0) {
            this.emit(LiveTimerEvents.started, userExposedConfig, local);
        } else if (config.duration === config.position) {
            this.emit(LiveTimerEvents.finished, userExposedConfig);
        } else if (config.running) {
            this.emit(LiveTimerEvents.played, userExposedConfig, local);
        } else {
            this.emit(LiveTimerEvents.paused, userExposedConfig, local);
        }

        if (clone.running) {
            this.startTicking();
        }
    }

    private playEventToConfig(event: IPlayEvent): ITimerConfig {
        const newConfig: ITimerConfig = {
            configChangedAt: event.timestamp,
            clientId: event.clientId!,
            duration: event.duration,
            position: event.position,
            running: true,
        };
        return newConfig;
    }

    private pauseEventToConfig(event: IPauseEvent): ITimerConfig {
        const newConfig: ITimerConfig = {
            configChangedAt: event.timestamp,
            clientId: event.clientId!,
            duration: event.duration,
            position: event.position,
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
                const timestamp = LiveEvent.getTimestamp();
                const endTime = endTimeFromConfig(this._currentConfig);
                if (timestamp >= endTime) {
                    const newConfig: ITimerConfig = {
                        configChangedAt: timestamp,
                        clientId: this._scope!.clientId!,
                        duration: this._currentConfig.duration,
                        position: this._currentConfig.duration,
                        running: false,
                    };
                    this.updateConfig(newConfig, true);
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
