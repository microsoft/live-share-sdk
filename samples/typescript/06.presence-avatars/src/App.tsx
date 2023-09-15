/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    FluentProvider,
    teamsDarkTheme,
    teamsHighContrastTheme,
    teamsLightTheme,
} from "@fluentui/react-components";
import * as teamsJs from "@microsoft/teams-js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { TabContent, TabConfig } from "./pages";
import { inTeams } from "./utils/inTeams";

const App = () => {
    const startedInitializingRef = useRef(false);
    const [initialized, setInitialized] = useState(false);
    const [teamsTheme, setTeamsTheme] = useState(teamsLightTheme);

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
                await teamsJs.app.initialize();
                teamsJs.app.notifyAppLoaded();
                teamsJs.app.notifySuccess();
                const context = await teamsJs.app.getContext();
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
                teamsJs.app.registerOnThemeChangeHandler(
                    (theme: string | undefined) => {
                        if (theme == "dark") {
                            setTeamsTheme(teamsDarkTheme);
                        } else if (theme == "contrast") {
                            setTeamsTheme(teamsHighContrastTheme);
                        } else {
                            setTeamsTheme(teamsLightTheme);
                        }
                    }
                );
                setInitialized(true);
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
                }}
            >
                <Router window={window} basename="/">
                    <Routes>
                        <Route path={"/"} element={<TabContent />} />
                        <Route path={"/config"} element={<TabConfig />} />
                    </Routes>
                </Router>
            </FluentProvider>
        );
    }
    return null;
};

export default App;
