/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TimeInterval } from "./TimeInterval";
import { LiveEventSource } from "./LiveEventSource";
import { ILiveEvent } from "./interfaces";

/**
 * Periodically broadcasts an event to listening `LiveEventTarget` instances.
 */
export class LiveEventTimer<T extends object = object> {
    private _eventSource: LiveEventSource<T>;
    private _createEvent: () => T;
    private _delay: TimeInterval;
    private _isRunning = false;
    private _timer?: any;

    /**
     * Creates a new `LiveEventTimer instance.
     * @param eventSource Event source that will be used to emit events.
     * @param createEvent Function used to construct an event to send. This will be called at regular intervals prior to sending an event.
     * @param delay Period to delay for in milliseconds.
     * @param repeat Optional. If true the timer will repeat once `start` is called, otherwise a single event will be sent after the delay. Defaults to false.
     */
    constructor(
        eventSource: LiveEventSource<T>,
        createEvent: () => T,
        delay: number,
        repeat = false
    ) {
        this._eventSource = eventSource;
        this._createEvent = createEvent;
        this._delay = new TimeInterval(delay);
        this.repeat = repeat;
    }

    /**
     * The rate at which the events are sent in milliseconds.
     */
    public get delay(): number {
        return this._delay.milliseconds;
    }

    public set delay(value: number) {
        this._delay.milliseconds = value;
    }

    /**
     * Returns true if the timer is currently running.
     */
    public get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * If true the event will automatically repeat at an interval specified by the `delay`.
     */
    public repeat: boolean;

    /**
     * Immediately sends an event.
     *
     * @remarks
     * The `createEvent` callback to construct the event is called but does not impact any pending
     * timeouts. Call `start` after calling `sendEvent` if you'd like to skip the next timer
     * interval.
     */
    public sendEvent(): Promise<ILiveEvent<T>> {
        const evt = this._createEvent();
        return this._eventSource.sendEvent(evt);
    }

    /**
     * Starts the timer.
     *
     * @remarks
     * If the timer is running it will be stooped and then re-started with a new `delay`.
     */
    public start(): void {
        this.stop();
        this._isRunning = true;
        this.delayedEmit(this.delay);
    }

    /**
     * Stops the timer if its running.
     */
    public stop(): void {
        if (this._timer != undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
        this._isRunning = false;
    }

    private delayedEmit(delay: number): void {
        this._timer = setTimeout(() => {
            this._timer = undefined;
            const startedAt = new Date().getTime();
            this.sendEvent().catch((err) => {
                console.warn(err);
            });

            // Auto-repeat
            if (this._isRunning && this.repeat) {
                // We want to send an every ${this.delay} milliseconds so we subtract the duration
                // of the time it took us to emit the event.  If it took longer then ${this.delay}
                // we will skip to the next interval (hence the %mod% operation.)
                const duration =
                    (new Date().getTime() - startedAt) % this.delay;
                this.delayedEmit(this.delay - duration);
            }
        }, delay);
    }
}
