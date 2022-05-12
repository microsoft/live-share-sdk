/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// eslint-disable-next-line
import { EphemeralEvent } from "@microsoft/live-share";
import { useState, useEffect, useCallback } from "react";

/**
 * Hook for sending notifications to display across clients
 *
 * @remarks
 *
 * @param {EphemeralEvent} notificationEvent presence object from Fluid container.
 * @returns `{notificationStarted, notificationToDisplay, sendNotification}` where:
 * - `notificationStarted` is a boolean indicating whether `notificationEvent.start()` has been called.
 * - `notificationToDisplay` is the most recent notification to display.
 * - `sendNotification` is a callback method for sending a notification to other users in session.
 */
export const useNotifications = (notificationEvent) => {
  const [notificationToDisplay, setNotificationToDisplay] = useState();
  const [notificationStarted, setStarted] = useState(false);

  const sendNotification = useCallback(
    async (notificationText) => {
      console.log("useNotifications: sending a notification");
      // Emit the event
      notificationEvent?.sendEvent({
        text: notificationText,
      });
    },
    [notificationEvent]
  );

  useEffect(() => {
    if (notificationEvent && !notificationEvent.isStarted) {
      console.log("useNotifications: starting notifications");
      notificationEvent.on("received", (event, local) => {
        // Display notification differently for local vs. remote users
        if (local) {
          setNotificationToDisplay(`You ${event.text}`);
        } else {
          setNotificationToDisplay(`Someone ${event.text}`);
        }
      });
      notificationEvent
        .start()
        .then(() => {
          console.log("useNotifications: notifications started");
          setStarted(true);
          sendNotification("joined the live session");
        })
        .catch((error) => console.error(error));
    }
  }, [notificationEvent, setNotificationToDisplay, sendNotification, setStarted]);

  return {
    notificationStarted,
    notificationToDisplay,
    sendNotification,
  };
};
