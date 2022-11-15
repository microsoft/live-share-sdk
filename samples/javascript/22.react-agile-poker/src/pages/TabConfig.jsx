/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { useEffect } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
// UI imports:
import { getFlexColumnStyles } from "../styles/layout";
import { mergeClasses, Title2, Subtitle2 } from "@fluentui/react-components";

const TabConfig = () => {
    useEffect(() => {
        microsoftTeams.pages.config.registerOnSaveHandler(function (saveEvent) {
            microsoftTeams.pages.config.setConfig({
                suggestedDisplayName: "Agile Poker",
                contentUrl: `${window.location.origin}/#/sidepanel?inTeams=true`,
            });
            saveEvent.notifySuccess();
        });

        microsoftTeams.pages.config.setValidityState(true);
    }, []);

    const flexColumnStyles = getFlexColumnStyles();
    return (
        <div
            className={mergeClasses(
                flexColumnStyles.root,
                flexColumnStyles.hAlignCenter,
                flexColumnStyles.vAlignCenter,
                flexColumnStyles.fill,
                flexColumnStyles.smallGap
            )}
        >
            <Title2 block align="center">
                Welcome to Agile Poker!
            </Title2>
            <Subtitle2 block align="center">
                Press the save button to continue.
            </Subtitle2>
        </div>
    );
};

export default TabConfig;
