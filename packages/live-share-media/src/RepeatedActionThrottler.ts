/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { TimeInterval } from "@microsoft/live-share";
import { MediaSessionActionThrottler } from "./MediaSessionActionThrottler";
import {
    ExtendedMediaSessionActionDetails,
    ExtendedMediaSessionAction,
} from "./MediaSessionExtensions";

/**
 *  A Throttler that passes through all actions but will only let an action be repeated once every 2 seconds.
 */
export class RepeatedActionThrottler extends MediaSessionActionThrottler {
    private static FILTERED_ACTIONS: ExtendedMediaSessionAction[] = [
        "play",
        "pause",
        "seekto",
        "catchup",
    ];
    private _repeatInterval = new TimeInterval(2000);
    private _lastActionSentTime?: number;
    private _lastActionSent?: string;

    public get repeatInterval(): number {
        return this._repeatInterval.seconds;
    }

    public set repeatInterval(value: number) {
        this._repeatInterval.seconds = value;
    }

    public throttled(
        details: MediaSessionActionDetails | ExtendedMediaSessionActionDetails,
        handler?: MediaSessionActionHandler
    ): void {
        if (handler) {
            if (
                RepeatedActionThrottler.FILTERED_ACTIONS.indexOf(
                    details.action
                ) >= 0
            ) {
                const changeKey = this.getChangeKey(details);
                const now = new Date().getTime();
                if (this._lastActionSent && changeKey == this._lastActionSent) {
                    if (
                        now - this._lastActionSentTime! >=
                        this._repeatInterval.milliseconds
                    ) {
                        handler(details as MediaSessionActionDetails);
                        this._lastActionSentTime = now;
                    }
                } else {
                    handler(details as MediaSessionActionDetails);
                    this._lastActionSent = changeKey;
                    this._lastActionSentTime = now;
                }
            } else {
                handler(details as MediaSessionActionDetails);
            }
        }
    }

    private getChangeKey(
        details: MediaSessionActionDetails | ExtendedMediaSessionActionDetails
    ): string {
        switch (details.action) {
            case "seekto":
                return `seekto:${details.seekTime}`;
            default:
                return details.action;
        }
    }
}
