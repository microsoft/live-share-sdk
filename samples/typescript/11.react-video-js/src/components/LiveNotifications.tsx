/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useRef, FC } from "react";
import { mergeClasses } from "@fluentui/react-components";
import { useLiveEvent } from "@microsoft/live-share-react";
import { getLiveNotificationStyles, getPillStyles } from "../styles/styles";
import { FlexColumn } from "./flex";
import { UNIQUE_KEYS } from "../constants";
import { LivePresence } from "@microsoft/live-share";

interface Notification {
    id: string;
    text: string;
}

interface ILiveNotificationsProps {
    notificationToDisplay: string | undefined;
}

export const LiveNotifications: FC<ILiveNotificationsProps> = ({
    notificationToDisplay,
}) => {
    const notificationsRef = useRef<Notification[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    useEffect(() => {
        if (notificationToDisplay) {
            // Display the notification
            const updatedNotifications: Notification[] = [
                ...notificationsRef.current,
            ];
            const notificationId = `notification${Math.abs(
                Math.random() * 999999999
            )}`;
            updatedNotifications.push({
                id: notificationId,
                text: notificationToDisplay,
            });
            notificationsRef.current = updatedNotifications;
            setNotifications(notificationsRef.current);

            // Remove the notification after a 1s delay
            setTimeout(() => {
                const resetNotifications = [...notificationsRef.current];
                const matchIndex = resetNotifications.findIndex(
                    (notification) => notification.id === notificationId
                );
                if (matchIndex >= 0) {
                    resetNotifications.splice(matchIndex, 1);
                    notificationsRef.current = resetNotifications;
                    setNotifications(notificationsRef.current);
                }
            }, 1500);
        }
    }, [notificationToDisplay, setNotifications]);

    const pillStyles = getPillStyles();
    const liveNotificationStyles = getLiveNotificationStyles();

    return (
        <FlexColumn
            hAlign="center"
            className={mergeClasses(liveNotificationStyles.root)}
        >
            {notifications.map((notification) => {
                return (
                    <div
                        className={mergeClasses(pillStyles.root)}
                        key={notification.id}
                    >
                        {notification.text}
                    </div>
                );
            })}
        </FlexColumn>
    );
};

/**
 * Hook for sending notifications to display across clients
 */
const useNotifications = (livePresence: LivePresence) => {
    const { latestEvent, sendEvent } = useLiveEvent<string>(
        UNIQUE_KEYS.notifications
    );

    return {
        notificationToDisplay: latestEvent
            ? `${livePresence.getUserForClient(latestEvent.clientId)} ${
                  latestEvent.value
              }`
            : undefined,
        sendNotification: sendEvent,
    };
};
