/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// eslint-disable-next-line
import { LiveEvent } from "@microsoft/live-share";
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook for sending notifications to display across clients
 *
 * @remarks
 *
 * @param {LiveEvent} notificationEvent presence object from Fluid container.
 * @param {microsoftTeams.app.Context} context Teams context object
 * @returns `{notificationStarted, notificationToDisplay, sendNotification}` where:
 * - `notificationStarted` is a boolean indicating whether `notificationEvent.initialize()` has been called.
 * - `notificationToDisplay` is the most recent notification to display.
 * - `sendNotification` is a callback method for sending a notification to other users in session.
 */
export const useNotifications = (notificationEvent, context) => {
    const initializeStartedRef = useRef(false);
    const [notificationToDisplay, setNotificationToDisplay] = useState();
    const [notificationStarted, setStarted] = useState(false);

    const sendNotification = useCallback(
        async (notificationText) => {
            console.log("useNotifications: sending a notification");
            const userPrincipalName =
                context?.user.userPrincipalName ?? "Someone@contoso.com";
            const name = userPrincipalName.split("@")[0];
            // Emit the event
            notificationEvent?.send({
                text: notificationText,
                senderName: name,
            });
        },
        [notificationEvent, context]
    );

    useEffect(() => {
        if (
            !notificationEvent ||
            notificationEvent.isInitialized ||
            initializeStartedRef.current
        )
            return;
        initializeStartedRef.current = true;
        notificationEvent.on("received", (event, local) => {
            // Display notification differently for local vs. remote users
            if (local) {
                setNotificationToDisplay(`You ${event.text}`);
            } else {
                setNotificationToDisplay(`${event.senderName} ${event.text}`);
            }
        });
        console.log("useNotifications: starting notifications");
        notificationEvent
            .initialize()
            .then(() => {
                console.log("useNotifications: notifications started");
                setStarted(true);
            })
            .catch((error) => console.error(error));
    }, [notificationEvent, setNotificationToDisplay, setStarted]);

    return {
        notificationStarted,
        notificationToDisplay,
        sendNotification,
    };
};
