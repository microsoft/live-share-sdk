/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import { UserMeetingRole } from "@microsoft/live-share";
import {
  useSharedObjects,
  useMediaSession,
  useNotifications,
  usePresence,
  useTakeControl,
  usePlaylist,
} from "../teams-interactive-hooks";
import {
  LiveNotifications,
  MediaPlayerContainer,
  PageError,
} from "../components";
import { AzureMediaPlayer } from "../utils/AzureMediaPlayer";

// Choose roles that can control playback (e.g., pause/play)
// If empty or undefined, all users can control playback
const ACCEPT_PLAYBACK_CHANGES_FROM = [
  UserMeetingRole.presenter,
  UserMeetingRole.organizer,
];

const MeetingStage = () => {
  // Media player
  const [player, setPlayer] = useState();

  // Fluid objects hook which uses TeamsFluidClient to create container
  const {
    presence, // EphemeralPresence Fluid object
    mediaSession, // EphemeralMediaSession Fluid object
    notificationEvent, // EphemeralEvent Fluid object
    takeControlMap, // SharedMap Fluid object for presenter control
    playlistMap, // SharedMap Fluid object for playlist
    error, // Join container error
  } = useSharedObjects();

  // EphemeralEvent hook
  const {
    notificationStarted, // boolean that is true once notificationEvent.start() is called
    notificationToDisplay, // most recent notification that was sent through notificationEvent
    sendNotification, // callback method to send a notification through notificationEvent
  } = useNotifications(notificationEvent);

  // EphemeralPresence hook
  const {
    presenceStarted, // boolean that is true once presence.start() is called
    localUser, // local user presence object
    localUserIsEligiblePresenter, // boolean that is true if local user is eligible to take control
    users, // user presence array
  } = usePresence(presence, ACCEPT_PLAYBACK_CHANGES_FROM, sendNotification);

  // Take control map
  const {
    takeControlStarted, // boolean that is true once takeControlMap.on() listener is registered
    localUserIsPresenting, // boolean that is true if local user is currently presenting
    takeControl, // callback method to take control of playback
  } = useTakeControl(
    takeControlMap,
    localUser?.userId,
    localUserIsEligiblePresenter,
    users,
    sendNotification,
  );

  // Playlist map
  const {
    playlistStarted, // boolean that is true once playlistMap listener is registered
    selectedMediaItem, // selected media item object, or undefined if unknown
    nextTrack, // callback method to skip to the next track
  } = usePlaylist(playlistMap, sendNotification);

  // EphemeralMediaSession hook
  const {
    mediaSessionStarted, // boolean that is true once mediaSession.start() is called
    suspended, // boolean that is true if synchronizer is suspended
    play, // callback method to synchronize a play action
    pause, // callback method to synchronize a pause action
    seekTo, // callback method to synchronize a seekTo action
    endSuspension, // callback method to end the synchronizer suspension
  } = useMediaSession(
    mediaSession,
    selectedMediaItem,
    player,
    localUserIsPresenting,
    ACCEPT_PLAYBACK_CHANGES_FROM,
    sendNotification,
  );

  // Set up the media player
  useEffect(() => {
    if (!player && selectedMediaItem) {
      // Setup Azure Media Player
      const src = [{ src: selectedMediaItem.src }];
      const amp = new AzureMediaPlayer("video", src);
      // Set player when AzureMediaPlayer is ready to go
      const onReady = () => {
        setPlayer(amp);
        amp.removeEventListener("ready", onReady);
      };
      amp.addEventListener("ready", onReady);
    }
  }, [selectedMediaItem, player, setPlayer]);

  // Effect to stop showing Teams loading spinner
  useEffect(() => {
    if (notificationStarted && mediaSessionStarted && presenceStarted && takeControlStarted && playlistStarted) {
      microsoftTeams.appInitialization.notifySuccess();
    }
  }, [notificationStarted, mediaSessionStarted, presenceStarted, takeControlStarted, playlistStarted]);

  // Render the media player
  return (
    <div style={{ backgroundColor: "black" }}>
      {/* Display error if container failed to load */}
      {error && <PageError error={error} />}
      {/* Display Notifications */}
      <LiveNotifications notificationToDisplay={notificationToDisplay} />
      {/* Media Player */}
      <MediaPlayerContainer
        player={player}
        localUserIsPresenting={localUserIsPresenting}
        localUserIsEligiblePresenter={localUserIsEligiblePresenter}
        suspended={suspended}
        play={play}
        pause={pause}
        seekTo={seekTo}
        takeControl={takeControl}
        endSuspension={endSuspension}
        nextTrack={nextTrack}
      >
        {/* // Render video */}
        <video
          id="video"
          className="azuremediaplayer amp-default-skin amp-big-play-centered"
        />
      </MediaPlayerContainer>
    </div>
  );
};

export default MeetingStage;
