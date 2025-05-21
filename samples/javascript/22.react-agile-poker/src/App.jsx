/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    FluentProvider,
    webDarkTheme,
    webLightTheme,
} from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import MeetingStage from "./pages/MeetingStage";
import SidePanel from "./pages/SidePanel";
import TabConfig from "./pages/TabConfig";
import { inTeams } from "./utils/inTeams";

export default function App() {
    const initializeStartedRef = useRef(false);
    const [initialized, setInitialized] = useState(false);
    const [webTheme, setWebTheme] = useState(webDarkTheme);

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
                        setWebTheme(webDarkTheme);
                        break;
                    case "default":
                    default:
                        setWebTheme(webLightTheme);
                        break;
                }
                microsoftTeams.app.registerOnThemeChangeHandler(
                    function (theme) {
                        if (theme == "dark") {
                            setWebTheme(webDarkTheme);
                        } else {
                            setWebTheme(webLightTheme);
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
                theme={webTheme}
                style={{
                    minHeight: "0px",
                    position: "absolute",
                    left: "0",
                    right: "0",
                    top: "0",
                    bottom: "0",
                    overflow: "hidden",
                    // set bg color when testing in local browser
                    backgroundColor: inTeams() ? "transparent" : "#201F1F",
                }}
            >
                <Router>
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
