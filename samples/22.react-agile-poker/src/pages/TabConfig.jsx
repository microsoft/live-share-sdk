/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { useEffect } from "react";
import * as microsoftTeams from "@microsoft/teams-js";

// UI imports:
import { getFlexColumnStyles } from "../styles/layout";
import { mergeClasses, Title2, Subheadline } from "@fluentui/react-components";

const TabConfig = () => {
  useEffect(() => {
    microsoftTeams.settings.registerOnSaveHandler(function (saveEvent) {
      microsoftTeams.settings.setSettings({
        suggestedDisplayName: "Agile Poker",
        contentUrl: `${window.location.origin}/sidepanel?inTeams=true`,
      });
      saveEvent.notifySuccess();
    });

    microsoftTeams.settings.setValidityState(true);
    microsoftTeams.appInitialization.notifySuccess();
  }, []);

  const flexColumnStyles = getFlexColumnStyles();
  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.hAlignCenter,
        flexColumnStyles.vAlignCenter,
        flexColumnStyles.fill,
        flexColumnStyles.smallGap
      )}
    >
      <Title2 block align="center">
        Welcome to Agile Poker!
      </Title2>
      <Subheadline block align="center">
        Press the save button to continue.
      </Subheadline>
    </div>
  );
};

export default TabConfig;
