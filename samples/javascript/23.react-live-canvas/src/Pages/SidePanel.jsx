/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { meeting } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";

const SidePanel = () => {
    const shareToStage = () => {
        if (inTeams()) {
            meeting.shareAppContentToStage((error, result) => {
                if (!error) {
                    console.log("Started sharing to stage");
                } else {
                    console.warn("shareAppContentToStage failed", error);
                }
            }, window.location.origin + "?inTeams=1&view=stage");
        }
    };

    return (
        <>
            <header>
                Welcome to Live Canvas sample. Please click on Share To Stage
                button to view the canvas on stage.
            </header>
            <p>
                <button onClick={shareToStage}>Share To Stage</button>
            </p>
        </>
    );
};

export default SidePanel;
