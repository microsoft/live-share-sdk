/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    DataObject,
    DataObjectFactory,
    DataObjectTypes,
} from "@fluidframework/aqueduct";
import { IEventThisPlaceHolder } from "@fluidframework/common-definitions";
import { IEphemeralEvent, UserMeetingRole } from "./interfaces";
import { EphemeralEventScope } from './EphemeralEventScope';
import { EphemeralEventTarget } from './EphemeralEventTarget';
import { TimeInterval } from './TimeInterval';
import { EphemeralEvent } from "./EphemeralEvent";

export interface ITimerState {
    timeStarted: number;
    position: number;
    duration: number;
    running: boolean;
}

export interface IBeginTimerEvent extends IEphemeralEvent {
    duration: number;
}

export interface IPlayPauseEvent extends IEphemeralEvent {
    position: number;
}

export class EphemeralTimer extends DataObject<IEphemeralTimerEvents>  {
    private _hasStarted = false;
    private _state?: ITimerState;
    private _beginEvent?: EphemeralEventTarget<IBeginTimerEvent>;
    private _playEvent?: EphemeralEventTarget<IPlayPauseEvent>;
    private _pauseEvent?: EphemeralEventTarget<IPlayPauseEvent>;
    private _resetEvent?: EphemeralEventTarget<IEphemeralEvent>;
    private _timerInterval = new TimeInterval(100);
    private _intervalId: any;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:EphemeralTimer`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        EphemeralTimer.TypeName,
        EphemeralTimer,
        [],
        {}
    );

    public get isStarted(): boolean {
        return !!this._hasStarted;
    }

    public start(allowedRoles?: UserMeetingRole[]): Promise<void> {
        if (this.isStarted) {
            throw new Error(`Timer already started.`);
        }
        this._hasStarted = true;
        const scope = new EphemeralEventScope(this.runtime, allowedRoles);
        this._beginEvent = new EphemeralEventTarget(
            scope,
            "begin",
            (event, local) => this._handleBegin(event, local)
        );
        this._playEvent = new EphemeralEventTarget(
            scope,
            "play",
            (event, local) => this._handlePlayEvent(event, local)
        );
        this._pauseEvent = new EphemeralEventTarget(
            scope,
            "pause",
            (event, local) => this._handlePauseEvent(event, local)
        );
        this._resetEvent = new EphemeralEventTarget(
            scope,
            "reset",
            (event, local) => this._handleReset(local)
        );

        return Promise.resolve();
    }

    /**
     * Starts the shared timer.
     * @param duration Duration of the timer.
     */
    public begin(duration: number): void {
        this._beginEvent!.sendEvent({
            duration,
        });
    }

    /**
     * Plays the shared timer.
     */
    public play(): void {
        if (!this._state) {
            throw Error("Cannot call togglePlayPause before timer is started");
        }
        this._playEvent!.sendEvent({
            position: this._state!.position,
        });
    }

    /**
     * Plays the shared timer.
     */
    public pause(): void {
        if (!this._state) {
            throw Error("Cannot call togglePlayPause before timer is started");
        }
        this._pauseEvent!.sendEvent({
            position: this._state!.position,
        });
    }

    /**
     * Resets the shared timer for current duration.
     */
    public reset(): void {
        if (!this._state) {
            throw Error("Cannot call reset before timer is started");
        }
        this._resetEvent!.sendEvent({});
    }

    private _handleBegin(event: IBeginTimerEvent, local: boolean) {
        this._state = {
            timeStarted: EphemeralEvent.getTimestamp(),
            position: 0,
            duration: event.duration,
            running: true,
        };
        this._emitState(local);
        this._handleTimerInterval();
    }

    private _handlePlayEvent(event: IPlayPauseEvent, local: boolean) {
        if (
            this._state!.duration - this._timerInterval.milliseconds >=
            this._state!.position
        ) {
            this._state = {
                timeStarted: this._state!.timeStarted,
                position: event.position,
                duration: this._state!.duration,
                running: true,
            };
            this._emitState(local);
            this._handleTimerInterval();
        } else {
            this._handleReset(local);
        }
    }

    private _handlePauseEvent(event: IPlayPauseEvent, local: boolean) {
        this._state = {
            timeStarted: this._state!.timeStarted,
            position: event.position,
            duration: this._state!.duration,
            running: true,
        };
        this._emitState(local);
        this._cancelTimerIfRunning();
    }

    private _handleReset(local: boolean) {
        this._state = {
            timeStarted: EphemeralEvent.getTimestamp(),
            position: 0,
            duration: this._state!.duration,
            running: this._state!.running,
        };
        this._emitState(local);
        if (this._state.running) {
            this._handleTimerInterval();
        }
    }

    private _emitState(local: boolean) {
        const newState = Object.assign({}, this._state);
        this.emit("valueChanged", newState, local);
    }

    private _handleTimerInterval() {
        this._cancelTimerIfRunning();
        const intervalCallback = () => {
            const position = Math.min(
                EphemeralEvent.getTimestamp() - this._state!.timeStarted,
                this._state!.duration
            );
            this._state!.position = position;
            if (position >= this._state!.duration) {
                this._state!.running = false;
                this._cancelTimerIfRunning();
            }
            this._emitState(true);
        };
        this._intervalId = setInterval(
            intervalCallback.bind(this),
            this._timerInterval.milliseconds
        );
    }

    private _cancelTimerIfRunning() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = undefined;
        }
    }
}

interface IEphemeralTimerEvents extends DataObjectTypes {
    (event: "valueChanged", listener: (
        changed: ITimerState,
        local: boolean,
        target: IEventThisPlaceHolder
    ) => void
    ): void;
}
