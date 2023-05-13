/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect } from "react";
import { getFlexColumnStyles } from "../styles/layouts";
import { mergeClasses, Title2, Subtitle2 } from "@fluentui/react-components";
import { FlexColumn } from "../components/flex";

const TabConfig = () => {
    useEffect(() => {
        microsoftTeams.pages.config.registerOnSaveHandler(function (saveEvent) {
            microsoftTeams.pages.config.setConfig({
                suggestedDisplayName: "Contoso",
                contentUrl: `${window.location.origin}/sidepanel?inTeams=true`,
            });
            saveEvent.notifySuccess();
        });

        microsoftTeams.pages.config.setValidityState(true);
    }, []);

    const flexColumnStyles = getFlexColumnStyles();
    return (
        <FlexColumn
            hAlign="center"
            vAlign="center"
            fill="both"
            gap="small"
        >
            <Title2 block align="center">
                Welcome to Contoso Media!
            </Title2>
            <Subtitle2 block align="center">
                Press the save button to continue.
            </Subtitle2>
        </FlexColumn>
    );
};

export default TabConfig;
