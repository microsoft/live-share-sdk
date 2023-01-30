/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ITimerConfig,
    LiveTimerEvents,
    UserMeetingRole,
} from "@microsoft/live-share";
import { TurboLiveTimer } from "@microsoft/live-share-turbo";
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

export function useLiveTimer(
    uniqueKey: string,
    allowedRoles?: UserMeetingRole[],
    tickRate?: number,
    onTick?: OnTimerTickAction,
    onStart?: OnTimerDidStartAction,
    onPause?: OnTimerDidPauseAction,
    onPlay?: OnTimerDidPlayAction,
    onFinish?: OnTimerDidFinishAction,
): IUseLiveTimerResults {
    /**
     * Reference boolean for whether hook has registered "listening" events for `LiveTimer`.
     */
    const listeningRef = React.useRef(false);
    /**
     * User facing: Stateful timer config.
     */
    const [timerConfig, setTimerConfig] = React.useState<ITimerConfig>();
    /**
     * User facing: Stateful time remaining.
     */
    const [milliRemaining, setMilliRemaining] = React.useState<number>();

    const { clientRef } = useFluidObjectsContext();

    const getDDS = React.useCallback((): Promise<TurboLiveTimer> => {
        return TurboLiveTimer.create(clientRef.current, uniqueKey);
    }, [uniqueKey]);
    /**
     * User facing: dynamically load the TurboLiveTimer DDS for the given unique key.
     */
    const { dds: liveTimer } = useDynamicDDS<TurboLiveTimer>(getDDS);

    /**
     * User facing: callback to send event through `LiveTimer`
     */
    const start: OnStartTimerAction = React.useCallback(
        (duration: number): void => {
            if (liveTimer?.isInitialized === undefined) {
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
            liveTimer?.start(duration);
        },
        [liveTimer?.isInitialized]
    );

    /**
     * User facing: callback to send event through `LiveTimer`
     */
    const play: OnPlayTimerAction = React.useCallback((): void => {
        if (liveTimer?.isInitialized === undefined) {
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
        liveTimer?.play();
    }, [liveTimer?.isInitialized]);

    /**
     * User facing: callback to send event through `LiveTimer`
     */
    const pause: OnPauseTimerAction = React.useCallback((): void => {
        if (liveTimer?.isInitialized === undefined) {
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
        liveTimer?.pause();
    }, [liveTimer?.isInitialized]);

    /**
     * Setup change listeners and start `LiveTimer` if needed
     */
    React.useEffect(() => {
        if (listeningRef.current || liveTimer?.isInitialized === undefined)
            return;
        listeningRef.current = true;
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
            listeningRef.current = false;
            liveTimer?.off(LiveTimerEvents.started, onDidStart);
            liveTimer?.off(LiveTimerEvents.finished, onDidFinish);
            liveTimer?.off(LiveTimerEvents.played, onDidPlay);
            liveTimer?.off(LiveTimerEvents.paused, onDidPause);
            liveTimer?.off(LiveTimerEvents.onTick, onDidTick);
        };
    }, [liveTimer?.isInitialized, onTick, onStart, onFinish, onPlay, onPause]);

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
