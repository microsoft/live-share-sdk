/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ITimerConfig,
    LiveTimerEvents,
    UserMeetingRole,
    LiveTimer,
} from "@microsoft/live-share";
import React from "react";
import {
    IUseLiveTimerResults,
    OnPauseTimerAction,
    OnPlayTimerAction,
    OnStartTimerAction,
    OnTimerDidFinishAction,
    OnTimerDidPauseAction,
    OnTimerDidPlayAction,
    OnTimerDidStartAction,
    OnTimerTickAction,
} from "../types";
import { useDynamicDDS } from "../shared-hooks";

export function useLiveTimer(
    uniqueKey: string,
    allowedRoles?: UserMeetingRole[],
    tickRate?: number,
    onTick?: OnTimerTickAction,
    onStart?: OnTimerDidStartAction,
    onPause?: OnTimerDidPauseAction,
    onPlay?: OnTimerDidPlayAction,
    onFinish?: OnTimerDidFinishAction
): IUseLiveTimerResults {
    /**
     * User facing: Stateful timer config.
     */
    const [timerConfig, setTimerConfig] = React.useState<ITimerConfig>();
    /**
     * User facing: Stateful time remaining.
     */
    const [milliRemaining, setMilliRemaining] = React.useState<number>();
    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveTimer } = useDynamicDDS<LiveTimer>(uniqueKey, LiveTimer);

    /**
     * Callback to send event through `LiveTimer`
     * @param duration the duration for the timer in milliseconds
     * @returns void promise that will throw when user does not have required roles
     */
    const start: OnStartTimerAction = React.useCallback(
        async (duration: number) => {
            if (liveTimer === undefined) {
                console.error(
                    new Error("Cannot call start when liveTimer is undefined")
                );
                return;
            }
            if (!liveTimer.isInitialized) {
                console.error(
                    new Error(
                        "Cannot call start while liveTimer is not started"
                    )
                );
                return;
            }
            return await liveTimer.start(duration);
        },
        [liveTimer]
    );

    /**
     * Callback to send event through `LiveTimer`
     * @returns void promise that will throw when user does not have required roles
     */
    const play: OnPlayTimerAction = React.useCallback(async () => {
        if (liveTimer === undefined) {
            console.error(
                new Error("Cannot call play when liveTimer is undefined")
            );
            return;
        }
        if (!liveTimer.isInitialized) {
            console.error(
                new Error("Cannot call play while liveTimer is not started")
            );
            return;
        }
        return await liveTimer.play();
    }, [liveTimer]);

    /**
     * Callback to send event through `LiveTimer`
     * @returns void promise that will throw when user does not have required roles
     */
    const pause: OnPauseTimerAction = React.useCallback(async () => {
        if (liveTimer === undefined) {
            console.error(
                new Error("Cannot call pause when liveTimer is undefined")
            );
            return;
        }
        if (!liveTimer.isInitialized) {
            console.error(
                new Error("Cannot call pause while liveTimer is not started")
            );
            return;
        }
        return await liveTimer.pause();
    }, [liveTimer]);

    /**
     * Setup change listeners and start `LiveTimer` if needed
     */
    React.useEffect(() => {
        if (liveTimer === undefined) return;
        // Register event listeners
        const onTimerConfigChange = (config: ITimerConfig) => {
            setTimerConfig(config);
        };
        const onDidStart = (config: ITimerConfig) => {
            onTimerConfigChange(config);
            onStart?.(config);
            setMilliRemaining(config.duration);
        };
        const onDidFinish = (config: ITimerConfig) => {
            onTimerConfigChange(config);
            onFinish?.(config);
            setMilliRemaining(0);
        };
        const onDidPlay = (config: ITimerConfig) => {
            onTimerConfigChange(config);
            onPlay?.(config);
        };
        const onDidPause = (config: ITimerConfig) => {
            onTimerConfigChange(config);
            onPause?.(config);
        };
        const onDidTick = (milliseconds: number) => {
            setMilliRemaining(milliseconds);
            onTick?.(milliseconds);
        };
        liveTimer.on(LiveTimerEvents.started, onDidStart);
        liveTimer.on(LiveTimerEvents.finished, onDidFinish);
        liveTimer.on(LiveTimerEvents.played, onDidPlay);
        liveTimer.on(LiveTimerEvents.paused, onDidPause);
        liveTimer.on(LiveTimerEvents.onTick, onDidTick);
        if (!liveTimer.isInitialized) {
            // Start live event
            liveTimer.initialize(allowedRoles);
        }

        return () => {
            // on unmount, remove event listeners
            liveTimer?.off(LiveTimerEvents.started, onDidStart);
            liveTimer?.off(LiveTimerEvents.finished, onDidFinish);
            liveTimer?.off(LiveTimerEvents.played, onDidPlay);
            liveTimer?.off(LiveTimerEvents.paused, onDidPause);
            liveTimer?.off(LiveTimerEvents.onTick, onDidTick);
        };
    }, [liveTimer, onTick, onStart, onFinish, onPlay, onPause]);

    /**
     * Change tick rate if changes in props
     */
    React.useEffect(() => {
        if (
            tickRate !== undefined &&
            liveTimer?.tickRate !== undefined &&
            tickRate !== liveTimer?.tickRate
        ) {
            liveTimer.tickRate = tickRate;
        }
    }, [tickRate, liveTimer?.tickRate]);

    return {
        liveTimer,
        milliRemaining,
        pause,
        play,
        start,
        timerConfig,
    };
}
