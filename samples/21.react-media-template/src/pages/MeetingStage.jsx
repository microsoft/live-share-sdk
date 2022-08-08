/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useMemo, useState } from "react";
import * as liveShareHooks from "../live-share-hooks";
import {
  LiveNotifications,
  LiveSharePage,
  MediaPlayerContainer,
  PageError,
} from "../components";
import { AzureMediaPlayer } from "../utils/AzureMediaPlayer";
import { ACCEPT_PLAYBACK_CHANGES_FROM } from "../constants/allowed-roles";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";

const MeetingStage = () => {
  // Teams context
  const context = useTeamsContext();
  // Media player
  const [player, setPlayer] = useState();

  // Fluid objects hook which uses TeamsFluidClient to create container
  const {
    presence, // EphemeralPresence Fluid object
    mediaSession, // EphemeralMediaSession Fluid object
    notificationEvent, // EphemeralEvent Fluid object
    takeControlMap, // SharedMap Fluid object for presenter control
    playlistMap, // SharedMap Fluid object for playlist
    inkEvent, // EphemeralEvent Fluid object
    container, // Fluid container
    error, // Join container error
  } = liveShareHooks.useSharedObjects();

  // Notification hook
  const {
    notificationStarted, // boolean that is true once notificationEvent.initialize() is called
    notificationToDisplay, // most recent notification that was sent through notificationEvent
    sendNotification, // callback method to send a notification through notificationEvent
  } = liveShareHooks.useNotifications(notificationEvent, context);

  // Presence hook
  const {
    presenceStarted, // boolean that is true once presence.initialize() is called
    localUser, // local user presence object
    localUserIsEligiblePresenter, // boolean that is true if local user is eligible to take control
    users, // user presence array
  } = liveShareHooks.usePresence(
    presence,
    ACCEPT_PLAYBACK_CHANGES_FROM,
    context
  );

  // Take control map
  const {
    takeControlStarted, // boolean that is true once takeControlMap.on() listener is registered
    localUserIsPresenting, // boolean that is true if local user is currently presenting
    takeControl, // callback method to take control of playback
  } = liveShareHooks.useTakeControl(
    takeControlMap,
    localUser?.data?.teamsUserId,
    localUserIsEligiblePresenter,
    users,
    sendNotification
  );

  // Playlist map
  const {
    playlistStarted, // boolean that is true once playlistMap listener is registered
    selectedMediaItem, // selected media item object, or undefined if unknown
    nextTrack, // callback method to skip to the next track
  } = liveShareHooks.usePlaylist(playlistMap, sendNotification);

  // Media session hook
  const {
    mediaSessionStarted, // boolean that is true once mediaSession.initialize() is called
    suspended, // boolean that is true if synchronizer is suspended
    play, // callback method to synchronize a play action
    pause, // callback method to synchronize a pause action
    seekTo, // callback method to synchronize a seekTo action
    endSuspension, // callback method to end the synchronizer suspension
  } = liveShareHooks.useMediaSession(
    mediaSession,
    selectedMediaItem,
    player,
    localUserIsPresenting,
    ACCEPT_PLAYBACK_CHANGES_FROM,
    sendNotification
  );

  // Ink hook
  const { inkStarted, strokesToDisplay, sendStrokes } = liveShareHooks.useInk(
    inkEvent,
    ACCEPT_PLAYBACK_CHANGES_FROM
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

  const started = useMemo(() => {
    return [
      notificationStarted,
      mediaSessionStarted,
      presenceStarted,
      takeControlStarted,
      playlistStarted,
      inkStarted,
    ].every((value) => value === true);
  }, [
    notificationStarted,
    mediaSessionStarted,
    presenceStarted,
    takeControlStarted,
    playlistStarted,
    inkStarted,
  ]);

  // Render the media player
  return (
    <div style={{ backgroundColor: "black" }}>
      {/* Display error if container failed to load */}
      {error && <PageError error={error} />}
      {/* Live Share wrapper to show loading indicator before setup */}
      <LiveSharePage context={context} container={container} started={started}>
        {/* Display Notifications */}
        <LiveNotifications notificationToDisplay={notificationToDisplay} />
        {/* Media Player */}
        <MediaPlayerContainer
          player={player}
          localUserIsPresenting={localUserIsPresenting}
          localUserIsEligiblePresenter={localUserIsEligiblePresenter}
          suspended={suspended}
          strokes={strokesToDisplay}
          play={play}
          pause={pause}
          seekTo={seekTo}
          takeControl={takeControl}
          endSuspension={endSuspension}
          nextTrack={nextTrack}
          sendStrokes={sendStrokes}
        >
          {/* // Render video */}
          <video
            id="video"
            className="azuremediaplayer amp-default-skin amp-big-play-centered"
          />
        </MediaPlayerContainer>
      </LiveSharePage>
    </div>
  );
};

export default MeetingStage;
