/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { LiveDataObject } from "@microsoft/live-share";
import { useCallback, useState } from "react";

export type DisplayNotificationCallback = (
    dds: LiveDataObject,
    baseText: string,
    clientId: string,
    local: boolean
) => Promise<void>;

/**
 * Hook for sending notifications to display across clients
 */
export const useNotifications = () => {
    const [notificationToDisplay, setNotificationToDisplay] =
        useState<string>();
    const displayNotification = useCallback(
        async (
            dds: LiveDataObject,
            baseText: string,
            clientId: string,
            local: boolean
        ) => {
            if (local) {
                setNotificationToDisplay(`You ${baseText}`);
                return;
            }
            const clientInfo = await dds.getClientInfo(clientId);
            const displayName = clientInfo?.displayName ?? "Unknown";
            setNotificationToDisplay(`${displayName} ${baseText}`);
        },
        []
    );

    return {
        notificationToDisplay,
        displayNotification,
    };
};
