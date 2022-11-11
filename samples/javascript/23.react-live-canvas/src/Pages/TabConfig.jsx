/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect } from "react";
import { inTeams } from "../utils/inTeams";

const TabConfig = () => {
    useEffect(() => {
        if (!inTeams()) {
            return;
        }

        microsoftTeams.pages.config.registerOnSaveHandler(function (saveEvent) {
            microsoftTeams.pages.config.setConfig({
                suggestedDisplayName: "LiveCanvasSample",
                contentUrl: `${window.location.origin}/sidepanel?inTeams=true`,
            });
            saveEvent.notifySuccess();
        });

        microsoftTeams.pages.config.setValidityState(true);
    }, []);
    return (
        <div>
            <header>Welcome to Live Canvas React sample!</header>
            <header>Press the save button to continue.</header>
        </div>
    );
};

export default TabConfig;
