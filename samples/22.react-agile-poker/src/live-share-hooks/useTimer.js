/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback } from "react";

export const useTimer = (timer, onTimerEnd) => {
  const [timerMilliRemaining, setTimerMilliRemaining] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);

  const beginTimer = useCallback(() => {
    console.log("beginning timer");
    timer.start(60000);
  }, [timer]);

  const pauseTimer = useCallback(() => {
    console.log("pausing timer");
    timer.pause();
  }, [timer]);

  useEffect(() => {
    if (timer && !timer.isStarted) {
      timer.on("onTimerChanged", (event, local) => {
        if (event.duration === event.position) {
          onTimerEnd();
        }
      });

      timer.on("onTick", (milliRemaining, local) => {
        console.log("tick");
        setTimerMilliRemaining(milliRemaining);
      });

      const allowedRoles = ["Organizer"];

      timer
        .finalInitialize(allowedRoles)
        .then(() => {
          console.log("starting timer4");
          setTimerStarted(true);
        })
        .catch((error) => console.error(error));
    }
  }, [timer, onTimerEnd, setTimerStarted]);

  return {
    timerMilliRemaining,
    timerStarted,
    beginTimer,
    pauseTimer,
  };
};
