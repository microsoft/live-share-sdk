/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { useEffect, useState, useCallback } from "react";
import PlayerProgressBar from "./PlayerProgressBar";
import { formatTimeValue } from "../utils/format";
import {
  Pause24Filled,
  Play24Filled,
  SpeakerMute24Filled,
  Speaker224Filled,
} from "@fluentui/react-icons";
import { debounce } from "lodash";
import { mergeClasses, Button, Text } from "@fluentui/react-components";
import {
  getFlexColumnStyles,
  getFlexItemStyles,
  getFlexRowStyles,
} from "../styles/layouts";
import { getPlayerControlStyles } from "../styles/styles";

const events = [
  "loadstart",
  "timeupdate",
  "play",
  "playing",
  "pause",
  "ended",
  "seeked",
  "seeking",
  "volumechange",
  "emptied",
];

export const MediaPlayerContainer = ({
  playerElementId = "player",
  onUserPlay,
  onUserPause,
  onUserSeekTo,
  children,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    playbackStarted: false,
    duration: 0,
    currentTime: 0,
    muted: true,
    volume: 1,
  });

  const hideControls = useCallback(() => {
    setShowControls(false);
  }, [setShowControls]);
  // eslint-disable-next-line
  const debouncedHideControls = useCallback(debounce(hideControls, 2500), [
    hideControls,
  ]);

  const togglePlayPause = () => {
    if (playerState.isPlaying) {
      onUserPause();
    } else {
      onUserPlay();
    }
  };

  useEffect(() => {
    // Add event listeners to player
    console.log("CustomControls: listening to player state changes");
    const player = document.getElementById(playerElementId);
    const onPlayerStateUpdate = () => {
      setPlayerState({
        isPlaying: !player.paused,
        playbackStarted: player.currentTime > 0,
        duration: player.duration || 0,
        currentTime: player.currentTime || 0,
        muted: player.muted,
        volume: player.volume,
      });
    };
    events.forEach((evt) => {
      player.addEventListener(evt, onPlayerStateUpdate);
    });
    return () => {
      const player = document.getElementById(playerElementId);
      events.forEach((evt) => {
        player?.removeEventListener(evt, onPlayerStateUpdate);
      });
    };
  }, [playerElementId]);

  const flexRowStyles = getFlexRowStyles();
  const flexColumnStyles = getFlexColumnStyles();
  const flexItemStyles = getFlexItemStyles();
  const playerControlStyles = getPlayerControlStyles();

  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        playerControlStyles.pointerTrackerContainer
      )}
      onMouseMove={() => {
        setShowControls(true);
        debouncedHideControls();
      }}
      style={{ backgroundColor: "black", minHeight: "0px" }}
    >
      <div onClick={togglePlayPause}>{children}</div>
      <div
        className={flexColumnStyles.root}
        style={{
          position: "absolute",
          left: "0",
          bottom: "0",
          right: "0",
          zIndex: 1,
          visibility:
            showControls || !playerState.isPlaying ? "visible" : "hidden",
          background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.4))",
        }}
      >
        {/* Seek Progress Bar */}
        <PlayerProgressBar
          currentTime={playerState.currentTime}
          duration={playerState.duration}
          isPlaybackDisabled={!playerState.playbackStarted}
          onSeek={onUserSeekTo}
        />
        <div
          className={mergeClasses(
            flexRowStyles.root,
            flexRowStyles.vAlignCenter,
            flexRowStyles.smallGap
          )}
          style={{ padding: "4px 12px", paddingTop: "0px", minWidth: "0px" }}
        >
          {/* Play Button */}
          <Button
            icon={playerState.isPlaying ? <Pause24Filled /> : <Play24Filled />}
            appearance="transparent"
            title={playerState.isPlaying ? "Pause" : "Play"}
            onClick={togglePlayPause}
          />
          {/* Mute Button */}
          <Button
            icon={
              playerState.muted ? <SpeakerMute24Filled /> : <Speaker224Filled />
            }
            appearance="transparent"
            title={playerState.muted ? "Unmute" : "Mute"}
            onClick={() => {
              const player = document.getElementById(playerElementId);
              player.muted = !playerState.muted;
            }}
          />
          <div
            className={mergeClasses(
              flexRowStyles.root,
              flexRowStyles.vAlignCenter,
              flexRowStyles.fill
            )}
          >
            {/* Formatted Time Value */}
            <div
              className={mergeClasses(
                flexItemStyles.noShrink,
                flexItemStyles.grow
              )}
            >
              <Text size={300} weight="medium">
                {formatTimeValue(playerState.currentTime)}
                {" / "}
                {formatTimeValue(playerState.duration)}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
