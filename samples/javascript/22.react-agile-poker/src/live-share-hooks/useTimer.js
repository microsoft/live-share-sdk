/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback, useRef } from "react";

export const useTimer = (timer, onTimerEnd) => {
    const initializeStartedRef = useRef(false);
    const [timerMilliRemaining, setTimerMilliRemaining] = useState(0);
    const [timerStarted, setTimerStarted] = useState(false);

    const beginTimer = useCallback(() => {
        console.log("starting timer");
        timer.start(60000);
    }, [timer]);

    const pauseTimer = useCallback(() => {
        console.log("pausing timer");
        timer.pause();
    }, [timer]);

    useEffect(() => {
        if (!timer || timer.isInitialized || initializeStartedRef.current) return;
        console.info("useTimer: initializing live timer");
        initializeStartedRef.current = true;
        timer.on("finished", (config) => {
            console.log("finished");
            onTimerEnd();
        });

        timer.on("onTick", (milliRemaining) => {
            setTimerMilliRemaining(milliRemaining);
        });

        const allowedRoles = ["Organizer"];

        timer.initialize(allowedRoles);
        setTimerStarted(true);
    }, [timer, onTimerEnd, setTimerStarted]);

    return {
        timerMilliRemaining,
        timerStarted,
        beginTimer,
        pauseTimer,
    };
};
