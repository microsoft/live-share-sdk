/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FluentProvider, teamsDarkTheme, teamsLightTheme, teamsHighContrastTheme } from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import MeetingStage from "./pages/MeetingStage";
import SidePanel from "./pages/SidePanel";
import TabConfig from "./pages/TabConfig";
import { inTeams } from "./utils/inTeams";

export default function App() {
    const [initialized, setInitialized] = useState(false);
    const [teamsTheme, setteamsTheme] = useState(teamsLightTheme);

    useEffect(() => {
        const initialize = async () => {
            try {
                console.log("App.js: initializing client SDK initialized");
                await microsoftTeams.app.initialize();
                microsoftTeams.app.notifyAppLoaded();
                microsoftTeams.app.notifySuccess();
                setInitialized(true);
                const context = await microsoftTeams.app.getContext();
                const curTheme = context.app.theme;
                switch(curTheme) {
                    case "dark":
                        setteamsTheme(teamsDarkTheme);
                        break;
                    case "contrast":
                        setteamsTheme(teamsHighContrastTheme);
                        break;
                    case "default":
                    default:
                        setteamsTheme(teamsLightTheme);
                        break;
                }
                microsoftTeams.app.registerOnThemeChangeHandler(function(theme) {
                    if (theme == "dark") {
                        setteamsTheme(teamsDarkTheme);
                    } else if (theme == "contrast") {
                        setteamsTheme(teamsHighContrastTheme);
                    } else {
                        setteamsTheme(teamsLightTheme);
                    }
                });
            } catch (error) {
                console.error(error);
            }
        };

        if (inTeams()) {
            console.log("App.js: initializing client SDK");
            initialize();
        }
    });

    const appReady = (inTeams() && initialized) || !inTeams();

    return (
        appReady && (
            <FluentProvider
                theme={teamsTheme}
                style={{
                    minHeight: "0px",
                    position: "absolute",
                    left: "0",
                    right: "0",
                    top: "0",
                    bottom: "0",
                    overflow: "hidden",
                    backgroundColor: inTeams() ? "transparent" : "#202020",
                }}
            >
                <Router window={window} basename="/">
                    <Routes>
                        <Route exact path={"/"} element={<MeetingStage />} />
                        <Route
                            exact
                            path={"/sidepanel"}
                            element={<SidePanel />}
                        />
                        <Route exact path={"/config"} element={<TabConfig />} />
                    </Routes>
                </Router>
            </FluentProvider>
        )
    );
}
