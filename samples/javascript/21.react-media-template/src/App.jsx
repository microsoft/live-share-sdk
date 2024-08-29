/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    FluentProvider,
    teamsDarkTheme,
    teamsLightTheme,
    teamsHighContrastTheme,
} from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import MeetingStage from "./pages/MeetingStage";
import SidePanel from "./pages/SidePanel";
import TabConfig from "./pages/TabConfig";
import { inTeams } from "./utils/inTeams";

export default function App() {
    const initializeStartedRef = useRef(false);
    const [initialized, setInitialized] = useState(false);
    const [teamsTheme, setTeamsTheme] = useState(teamsDarkTheme);

    useEffect(() => {
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // In production, you might consider using React Suspense if you are using React V18.
        // We are not doing this here because many customers are still using React V17.
        // We are monitoring the React Suspense situation closely and may revisit in the future.
        if (initializeStartedRef.current) return;
        initializeStartedRef.current = true;
        const initialize = async () => {
            try {
                console.log("App.js: initializing client SDK initialized");
                await microsoftTeams.app.initialize();
                microsoftTeams.app.notifyAppLoaded();
                microsoftTeams.app.notifySuccess();
                setInitialized(true);
                const context = await microsoftTeams.app.getContext();
                const curTheme = context.app.theme;
                switch (curTheme) {
                    case "dark":
                        setTeamsTheme(teamsDarkTheme);
                        break;
                    case "contrast":
                        setTeamsTheme(teamsHighContrastTheme);
                        break;
                    case "default":
                    default:
                        setTeamsTheme(teamsLightTheme);
                        break;
                }
                microsoftTeams.app.registerOnThemeChangeHandler(
                    function (theme) {
                        if (theme == "dark") {
                            setTeamsTheme(teamsDarkTheme);
                        } else if (theme == "contrast") {
                            setTeamsTheme(teamsHighContrastTheme);
                        } else {
                            setTeamsTheme(teamsLightTheme);
                        }
                    }
                );
            } catch (error) {
                console.error(error);
            }
        };

        if (inTeams()) {
            console.log("App.js: initializing client SDK");
            initialize();
        }
    }, []);

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
