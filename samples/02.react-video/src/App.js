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

export default function App() {
  // Initialize the tab SDK
  microsoftTeams.initialize();

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
        backgroundColor: "transparent",
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
