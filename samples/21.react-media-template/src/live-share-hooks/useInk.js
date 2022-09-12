/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// eslint-disable-next-line
import { EphemeralEvent } from "@microsoft/live-share";
import { useState, useEffect, useCallback } from "react";

/**
 * Hook for sending notifications to display across clients
 * This feature is experimental and you may not want to include
 * in your project.
 *
 * @remarks
 *
 * @param {EphemeralEvent} inkEvent presence object from Fluid container.
 * @param {string[]} acceptPlaybackChangesFrom roles of eligible presenters.
 * @returns `{inkStarted, strokesToDisplay, sendStrokes}` where:
 * - `inkStarted` is a boolean indicating whether `inkEvent.initialize()` has been called.
 * - `strokesToDisplay` are the most recent strokes sent.
 * - `sendStrokes` is a callback method for sending an array of strokes to other users in session.
 */
export const useInk = (inkEvent, acceptPlaybackChangesFrom) => {
  const [strokesToDisplay, setStrokesToDisplay] = useState();
  const [inkStarted, setStarted] = useState(false);

  // Send an event with the latest strokes
  const sendStrokes = useCallback(
    async (strokes) => {
      console.log("useInk: sending strokes");
      // Emit the event
      inkEvent?.sendEvent({
        strokes,
      });
    },
    [inkEvent]
  );

  useEffect(() => {
    if (inkEvent && !inkEvent.isInitialized) {
      console.log("useInk: initializing ink");
      inkEvent.on("received", (event, local) => {
        // Display notification differently for local vs. remote users
        if (!local) {
            console.log(event.strokes);
          setStrokesToDisplay(event.strokes);
        }
      });
      inkEvent
        .initialize(acceptPlaybackChangesFrom)
        .then(() => {
          console.log("useInk: ink initialize");
          setStarted(true);
        })
        .catch((error) => console.error(error));
    }
  }, [inkEvent, acceptPlaybackChangesFrom, setStrokesToDisplay, sendStrokes, setStarted]);

  return {
    inkStarted,
    strokesToDisplay,
    sendStrokes,
  };
};
