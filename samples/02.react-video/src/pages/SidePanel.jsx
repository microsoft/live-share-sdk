/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useCallback, useEffect } from "react";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
import { useNavigate } from "react-router-dom";
import * as microsoftTeams from "@microsoft/teams-js";
import { mergeClasses } from "@fluentui/react-components";
import { inTeams } from "../utils/inTeams";
import { mediaList } from "../utils/media-list";
import { MediaCard } from "../components";
import { getFlexColumnStyles, getFlexItemStyles } from "../styles/layouts";

const SidePanel = () => {
  const context = useTeamsContext();
  const navigate = useNavigate();
  useEffect(() => {
    if (context) {
      if (context.page.frameContext === "meetingStage") {
        // User shared the app directly to stage, redirect automatically
        navigate({
          pathname: "/",
          search: `?inTeams=true&mediaId=${mediaList[0].id}`,
        });
      }
    }
  }, [context, navigate]);
  const selectMedia = useCallback(
    (mediaItem) => {
      if (inTeams()) {
        microsoftTeams.meeting.shareAppContentToStage((error) => {
          if (error) {
            console.error(error);
          }
        }, `${window.location.origin}?inTeams=true&mediaId=${mediaItem.id}`);
      } else {
        navigate({
          pathname: '/',
          search: `?mediaId=${mediaItem.id}`,
        });
      }
    },
    [navigate]
  );
  const flexColumnStyles = getFlexColumnStyles();
  const flexItemStyles = getFlexItemStyles();
  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.fill,
        flexColumnStyles.vAlignStart,
        flexColumnStyles.scroll
      )}
    >
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.fill,
          flexColumnStyles.vAlignStart,
          flexColumnStyles.smallGap,
        )}
      >
        {mediaList.map((mediaItem) => (
          <div key={`media-item-${mediaItem.id}`} className={flexItemStyles.noShrink}>
            <MediaCard
              mediaItem={mediaItem}
              nowPlayingId={null}
              selectMedia={selectMedia}
            />
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default SidePanel;
