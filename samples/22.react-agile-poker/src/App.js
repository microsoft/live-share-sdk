/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FluentProvider, webDarkTheme } from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MeetingStage from "./pages/MeetingStage";
import SidePanel from "./pages/SidePanel";
import TabConfig from "./pages/TabConfig";
import { inTeams } from "./utils/inTeams";

export default function App() {

    const initialize = async () => 
    {
      try {
        console.log("App.js: initializing client SDK initialized");
        await microsoftTeams.app.initialize();
        microsoftTeams.app.notifyAppLoaded();
        microsoftTeams.app.notifySuccess();
      } catch (error) {
        console.error(error);
      }    
    };

    // initialize Teams SDK before any render.
    if (inTeams()) {
      console.log("App.js: initializing client SDK");
      initialize();
    }

  return (
    <FluentProvider
      theme={webDarkTheme}
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
          <Route exact path={"/sidepanel"} element={<SidePanel />} />
          <Route exact path={"/config"} element={<TabConfig />} />
        </Routes>
      </Router>
    </FluentProvider>
  );
}
