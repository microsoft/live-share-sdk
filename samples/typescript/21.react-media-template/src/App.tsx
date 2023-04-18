/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FluentProvider, teamsDarkTheme, teamsHighContrastTheme, teamsLightTheme } from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import MeetingStage from "./pages/MeetingStage";
import SidePanel from "./pages/SidePanel";
import TabConfig from "./pages/TabConfig";
import { inTeams } from "./utils/inTeams";

export const App = () => {
    const startedInitializingRef = useRef(false);
    const [initialized, setInitialized] = useState(false);
    const [teamsTheme, setteamsTheme] = useState(teamsLightTheme);

    useEffect(() => {
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // In production, you might consider using React Suspense if you are using React V18.
        // We are not doing this here because many customers are still using React V17.
        // We are monitoring the React Suspense situation closely and may revisit in the future.
        if (startedInitializingRef.current) return;
        startedInitializingRef.current = true;
        const initialize = async () => {
            try {
                console.log("App.tsx: initializing client SDK initialized");
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
                microsoftTeams.app.registerOnThemeChangeHandler((theme: string | undefined) => {
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
            console.log("App.tsx: initializing client SDK");
            initialize();
        }
    });

    const appReady = (inTeams() && initialized) || !inTeams();

    if (appReady) {
        console.log(teamsTheme);
        return (
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
                        <Route path={"/"} element={<MeetingStage />} />
                        <Route path={"/sidepanel"} element={<SidePanel />} />
                        <Route path={"/config"} element={<TabConfig />} />
                    </Routes>
                </Router>
            </FluentProvider>
        );
    } else {
        return null;
    }
};
