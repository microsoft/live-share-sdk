/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ITimerConfig,
    LiveTimerEvents,
    UserMeetingRole,
    LiveTimer,
    LiveDataObjectInitializeState,
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
import { useFluidObjectsContext } from "../providers";
import {
    ActionContainerNotJoinedError,
    ActionLiveDataObjectInitializedError,
    ActionLiveDataObjectUndefinedError,
} from "../internal";

/**
 * React hook for using Live Share's `LiveTimer` DDS.
 *
 * @remarks
 * Use this hook to create a synchronized countdown timer in your app or to schedule synchronized tasks.
 * This hook can only be used in a child component of `<LiveShareProvider>` or `<AzureProvider>`.
 *
 * @param uniqueKey the unique key for the `LiveTimer`. If one does not yet exist, a new one will be created, otherwise it will use the existing one.
 * @param allowedRoles Optional. the user roles that are allowed to start/stop/pause the timer.
 * @param tickRate Optional. the interval in which the `milliRemaining` state should be updated and the `onTick` callback will trigger.
 * @param onTick Optional. event handler callback for when an active timer ticks.
 * @param onStart Optional. event handler callback for when the timer is started.
 * @param onPause Optional. event handler callback for when the timer is paused.
 * @param onPlay Optional. event handler callback for when the timer is resumed.
 * @param onFinish Optional. event handler callback for when the timer finishes.
 * @returns results and callbacks exposed via the hook.
 */
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

    const { container } = useFluidObjectsContext();

    /**
     * Callback to send event through `LiveTimer`
     * @param duration the duration for the timer in milliseconds
     * @returns void promise that will throw when user does not have required roles
     */
    const start: OnStartTimerAction = React.useCallback(
        async (duration: number) => {
            if (!container) {
                throw new ActionContainerNotJoinedError("liveTimer", "start");
            }
            if (liveTimer === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "liveTimer",
                    "start"
                );
            }
            if (!liveTimer.isInitialized) {
                throw new ActionLiveDataObjectInitializedError(
                    "liveTimer",
                    "start"
                );
            }
            return await liveTimer.start(duration);
        },
        [container, liveTimer]
    );

    /**
     * Callback to send event through `LiveTimer`
     * @returns void promise that will throw when user does not have required roles
     */
    const play: OnPlayTimerAction = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError("liveTimer", "play");
        }
        if (liveTimer === undefined) {
            throw new ActionLiveDataObjectUndefinedError("liveTimer", "play");
        }
        if (!liveTimer.isInitialized) {
            throw new ActionLiveDataObjectInitializedError("liveTimer", "play");
        }
        return await liveTimer.play();
    }, [container, liveTimer]);

    /**
     * Callback to send event through `LiveTimer`
     * @returns void promise that will throw when user does not have required roles
     */
    const pause: OnPauseTimerAction = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError("liveTimer", "pause");
        }
        if (liveTimer === undefined) {
            throw new ActionLiveDataObjectUndefinedError("liveTimer", "pause");
        }
        if (!liveTimer.isInitialized) {
            throw new ActionLiveDataObjectInitializedError(
                "liveTimer",
                "pause"
            );
        }
        return await liveTimer.pause();
    }, [container, liveTimer]);

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
        if (
            liveTimer.initializeState === LiveDataObjectInitializeState.needed
        ) {
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
