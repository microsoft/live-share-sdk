/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback } from "react";

export const useTimer = (timer, onTimerEnd) => {
  const [timerState, setTimerState] = useState();
  const [timerStarted, setTimerStarted] = useState(false);

  const beginTimer = useCallback(() => {
    console.log("beginning timer");
    timer.begin(60000);
  }, [timer]);

  const pauseTimer = useCallback(() => {
    console.log("pausing timer");
    timer.pause();
  }, [timer]);

  useEffect(() => {
    if (timer && !timer.isStarted) {
      timer.on("valueChanged", (event, local) => {
        if (event.duration === event.position) {
          onTimerEnd();
        }
        setTimerState(event);
      });
      const allowedRoles = ["Organizer"];
      timer
        .start(allowedRoles)
        .then(() => {
          setTimerStarted(true);
        })
        .catch((error) => console.error(error));
    }
  }, [timer, onTimerEnd, setTimerStarted]);

  return {
    timerState,
    timerStarted,
    beginTimer,
    pauseTimer,
  };
};
