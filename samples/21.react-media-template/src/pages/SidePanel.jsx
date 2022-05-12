/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useCallback, useEffect } from "react";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
import { useNavigate } from "react-router-dom";
import * as microsoftTeams from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { mediaList } from "../utils/media-list";
import { MediaCard, ListWrapper } from "../components";
import { useNotifications, useSharedObjects } from "../teams-interactive-hooks";
import { usePlaylist } from "../teams-interactive-hooks/usePlaylist";
import { useSharingStatus } from "../teams-js-hooks/useSharingStatus";
import { ListHeader } from "../components/ListHeader";

const SidePanel = () => {
  const context = useTeamsContext();
  const sharingActive = useSharingStatus(context);
  const navigate = useNavigate();

  const { playlistMap, notificationEvent } = useSharedObjects();
  const { sendNotification } = useNotifications(notificationEvent);
  const { playlistStarted, mediaItems, selectedMediaItem, selectMediaId, addMediaItem } = usePlaylist(playlistMap, sendNotification);
  

  useEffect(() => {
    if (context && playlistStarted) {
      if (context.frameContext === "meetingStage") {
        // User shared the app directly to stage, redirect automatically
        selectMediaId(mediaList[0].id);
        navigate({
          pathname: "/",
          search: `?inTeams=true`,
        });
      }
      microsoftTeams.appInitialization.notifySuccess();
    }
  }, [context, playlistStarted, navigate, selectMediaId]);

  const selectMedia = useCallback(
    (mediaItem) => {
      // Set the selected media ID in the playlist map
      selectMediaId(mediaItem.id);
      if (inTeams()) {
        // If not already sharing to stage, share to stage
        if (!sharingActive) {
          microsoftTeams.meeting.shareAppContentToStage((error) => {
            if (error) {
              console.error(error);
            }
          }, `${window.location.origin}?inTeams=true`);
        }
      } else {
        // When testing locally, open in a new browser tab
        const id = window.location.hash.substring(1);
        window.open(`${window.location.origin}/#${id}`);
      }
    },
    [sharingActive, selectMediaId]
  );

  return (
    <ListWrapper>
      <ListHeader addMediaItem={addMediaItem} />
      {mediaItems.map((mediaItem) => (
        <MediaCard key={`media-item-${mediaItem.id}`}
          mediaItem={mediaItem}
          nowPlayingId={selectedMediaItem?.id}
          sharingActive={sharingActive}
          selectMedia={selectMedia}
        />
      ))}
    </ListWrapper>
  );
};

export default SidePanel;
