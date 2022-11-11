import "./App.css";
import * as microsoftTeams from "@microsoft/teams-js";
import { LiveCanvasPage } from "./Pages/LiveCanvasPage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SidePanel from "./Pages/SidePanel";
import TabConfig from "./Pages/TabConfig";
import { useEffect, useState } from "react";
import { inTeams } from "./utils/inTeams";

export default function App() {
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            try {
                console.log("App.js: initializing client SDK initialized");
                await microsoftTeams.app.initialize();
                microsoftTeams.app.notifyAppLoaded();
                microsoftTeams.app.notifySuccess();
                setInitialized(true);
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
            <Router>
                <Routes>
                    <Route exact path={"/"} element={<LiveCanvasPage />} />
                    <Route exact path={"/sidepanel"} element={<SidePanel />} />
                    <Route exact path={"/config"} element={<TabConfig />} />
                </Routes>
            </Router>
        )
    );
}
