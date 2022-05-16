/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// eslint-disable-next-line
import { UserMeetingRole } from "@microsoft/live-share";
// eslint-disable-next-line
import { EphemeralMediaSession } from "@microsoft/live-share-media";
import { useState, useEffect, useCallback, useRef } from "react";
// eslint-disable-next-line
import { AzureMediaPlayer } from "../utils/AzureMediaPlayer";
import { inTeams } from "../utils/inTeams";
import * as microsoftTeams from "@microsoft/teams-js";

/**
 * Hook that synchronizes a media element using MediaSynchronizer and EphemeralMediaSession
 *
 * @remarks
 * Works with any HTML5 <video> or <audio> element.
 * Must use custom media controls to intercept play, pause, and seek events.
 * Any pause/play/seek events not sent through the MediaSynchronizer will be blocked
 * while MediaSynchronizer is synchronizing.
 *
 * @param {EphemeralMediaSession} mediaSession media session object from Fluid container.
 * @param {any} selectedMediaItem selected media item from `usePlaylist` hook.
 * @param {AzureMediaPlayer} player amp player that matches <video> interface.
 * @param {boolean} localUserIsPresenting boolean when local user is presenting.
 * @param {UserMeetingRole[]} acceptPlaybackChangesFrom List of acceptable roles for playback transport commands.
 * @param {(text: string) => void} sendNotification Send notificaiton callback from `useNotification` hook.
 * @returns `{mediaSessionStarted, suspended, togglePlayPause, seek, setTrack, endSuspension}` where:
 * - `mediaSessionStarted` is a boolean indicating whether mediaSession.start() has been called.
 * - `suspended` is a flag indicating that the media synchronization is suspended.
 * - `play` is a callback method to play through the synchronizer.
 * - `pause` is a callback method to pause through the synchronizer.
 * - `seekTo` is a callback method to seek a video to a given timestamp (in seconds).
 * - `setTrack` is a callback method to change the selected track src.
 * - `endSuspension` is a callback method to end the active suspension.
 */
export const useMediaSession = (
  mediaSession,
  selectedMediaItem,
  player,
  localUserIsPresenting,
  acceptPlaybackChangesFrom,
  sendNotification
) => {
  const synchronizerRef = useRef(null);
  const [mediaSessionStarted, setStarted] = useState(false);
  const [suspension, setSuspension] = useState(null);
  // Audio ducking timer
  const volumeTimer = useRef(undefined);

  // callback method to change the selected track src
  const setTrack = useCallback(
    async (trackId) => {
      if (localUserIsPresenting) {
        const metadata = {
          trackIdentifier: trackId,
        };
        synchronizerRef.current.setTrack(metadata);
        sendNotification(`changed the ${selectedMediaItem.type}`);
      }
    },
    [
      synchronizerRef,
      selectedMediaItem,
      localUserIsPresenting,
      sendNotification,
    ]
  );

  // callback method to play through the synchronizer
  const play = useCallback(async () => {
    if (localUserIsPresenting) {
      // Synchronize the play action
      synchronizerRef.current.play();
      sendNotification(`played the ${selectedMediaItem.type}`);
    } else {
      // Stop following the presenter and play
      if (!suspension) {
        // Suspends media session coordinator until suspension is ended
        const newSuspension = mediaSession.coordinator.beginSuspension();
        setSuspension(newSuspension);
      }
      player.play();
    }
  }, [
    synchronizerRef,
    selectedMediaItem,
    localUserIsPresenting,
    player,
    suspension,
    mediaSession,
    setSuspension,
    sendNotification,
  ]);

  // callback method to play through the synchronizer
  const pause = useCallback(async () => {
    if (localUserIsPresenting) {
      // Synchronize the pause action
      synchronizerRef.current.pause();
      sendNotification(`paused the ${selectedMediaItem.type}`);
    } else {
      // Stop following the presenter and pause
      if (!suspension) {
        // Suspends media session coordinator until suspension is ended
        const newSuspension = mediaSession.coordinator.beginSuspension();
        setSuspension(newSuspension);
      }
      player.pause();
    }
  }, [
    synchronizerRef,
    selectedMediaItem,
    localUserIsPresenting,
    player,
    suspension,
    mediaSession,
    setSuspension,
    sendNotification,
  ]);

  // callback method to seek a video to a given timestamp (in seconds)
  const seekTo = useCallback(
    async (timestamp) => {
      if (localUserIsPresenting) {
        // Synchronize the seek action
        synchronizerRef.current.seekTo(timestamp);
        sendNotification(`seeked the ${selectedMediaItem.type}`);
      } else {
        // Stop following the presenter and seek
        if (!suspension) {
          const newSuspension = mediaSession.coordinator.beginSuspension();
          setSuspension(newSuspension);
        }
        player.currentTime = timestamp;
      }
    },
    [
      synchronizerRef,
      selectedMediaItem,
      localUserIsPresenting,
      player,
      suspension,
      mediaSession,
      setSuspension,
      sendNotification,
    ]
  );

  // If a suspension is active, end it. Called when "Follow presenter" button is clicked.
  const endSuspension = useCallback(() => {
    suspension?.end();
    setSuspension(null);
  }, [suspension]);

  // effect that sets up the EphemeralMediaSession and MediaSynchronizer
  useEffect(() => {
    if (
      mediaSession &&
      !mediaSession.isStarted &&
      !synchronizerRef.current &&
      selectedMediaItem &&
      player
    ) {
      console.log("useSharedSynchronizer: setting up player for synchronizer");
      // Query the HTML5 media element from the document and set initial src
      // Begin synchronizing a MediaSynchronizer for the player and set reference
      synchronizerRef.current = mediaSession.synchronize(player);

      // Default to viewOnly mode; this will get set to false for the current presenter below
      synchronizerRef.current.viewOnly = !localUserIsPresenting;

      // Start synchronizing the media session
      mediaSession.start(acceptPlaybackChangesFrom).then(() => {
        console.log("useSharedSynchronizer: now synchronizing player");
        setStarted(true);
        if (inTeams()) {
          // Set up audio ducking
          console.log(
            "useMediaSession: registering speaking state change handler"
          );
          microsoftTeams.meeting.registerSpeakingStateChangeHandler(
            (speakingState) => {
              console.log(
                "audio state changed:",
                speakingState.isSpeakingDetected
              );
              if (speakingState.isSpeakingDetected && !volumeTimer.current) {
                volumeTimer.current = setInterval(() => {
                  synchronizerRef.current?.volumeLimiter?.lowerVolume();
                }, 250);
              } else if (volumeTimer.current) {
                clearInterval(volumeTimer.current);
                volumeTimer.current = undefined;
              }
            }
          );
        }
      });
    }
  }, [
    mediaSession,
    selectedMediaItem,
    player,
    acceptPlaybackChangesFrom,
    localUserIsPresenting,
    setStarted,
  ]);

  // Hook to set player to view only mode when user is not the presenter and set track if needed
  useEffect(() => {
    if (synchronizerRef.current) {
      synchronizerRef.current.viewOnly = !localUserIsPresenting;
      const currentSrc = synchronizerRef.current.player.src;
      if (currentSrc && currentSrc[0].src === selectedMediaItem?.src) {
        return;
      }
      if (selectedMediaItem) {
        const trackSrc = [{ src: selectedMediaItem.src }];
        setTrack(trackSrc);
      }
    }
  }, [localUserIsPresenting, synchronizerRef, selectedMediaItem, setTrack]);

  // Return relevant objects and callbacks UI layer
  return {
    mediaSessionStarted,
    suspended: !!suspension,
    play,
    pause,
    seekTo,
    setTrack,
    endSuspension,
  };
};
