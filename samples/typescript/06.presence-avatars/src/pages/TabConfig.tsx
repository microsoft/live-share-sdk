/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { pages } from "@microsoft/teams-js";
import { FC, useEffect } from "react";
import { Title2, Subtitle2 } from "@fluentui/react-components";
import { FlexColumn } from "../components";

export const TabConfig: FC = () => {
    useEffect(() => {
        pages.config.registerOnSaveHandler(function (saveEvent) {
            pages.config.setConfig({
                suggestedDisplayName: "Presence",
                contentUrl: `${window.location.origin}/?inTeams=true`,
            });
            saveEvent.notifySuccess();
        });

        pages.config.setValidityState(true);
    }, []);

    return (
        <FlexColumn vAlign="center" hAlign="center" fill="view" gap="small">
            <Title2 as="h2" block align="center">
                Welcome to Presence Avatars!
            </Title2>
            <Subtitle2 as="p" block align="center">
                Press the save button to continue.
            </Subtitle2>
        </FlexColumn>
    );
};
