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
  SpeakerMute20Filled,
  Speaker220Filled,
  Next20Filled,
  Live20Filled,
} from "@fluentui/react-icons";
import { debounce } from "lodash";
import { mergeClasses, Button, Text } from "@fluentui/react-components";
import {
  getFlexColumnStyles,
  getFlexItemStyles,
  getFlexRowStyles,
} from "../styles/layouts";
import { getPlayerControlStyles, getVideoStyle } from "../styles/styles";

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
  player,
  localUserIsPresenting,
  localUserIsEligiblePresenter,
  suspended,
  play,
  pause,
  seekTo,
  takeControl,
  endSuspension,
  nextTrack,
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
    if (player.paused) {
      play();
    } else {
      pause();
    }
  };

  useEffect(() => {
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

    if (player) {
      // Add event listeners to player
      console.log("CustomControls: listening to player state changes");
      events.forEach((evt) => {
        player.addEventListener(evt, onPlayerStateUpdate);
      });
    }

    document.body.onkeyup = function(e) {
      e.preventDefault();
      if (e.key === " " ||
          e.code === "Space"   
      ) {
        // eslint-disable-next-line
        togglePlayPause();
      }
    }

    return () => {
      events.forEach((evt) => {
        player?.removeEventListener(evt, onPlayerStateUpdate);
      });
    };
  }, [player]);

  const flexRowStyles = getFlexRowStyles();
  const flexColumnStyles = getFlexColumnStyles();
  const flexItemStyles = getFlexItemStyles();
  const playerControlStyles = getPlayerControlStyles();
  const videoStyle = getVideoStyle();

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
    >
      <div className={videoStyle.root} onClick={togglePlayPause}>
        {children}
      </div>
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
          onSeek={seekTo}
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
          {/* Next Track Button */}
          {localUserIsPresenting && (
            <Button
              icon={<Next20Filled />}
              appearance="transparent"
              title={"Next track"}
              onClick={nextTrack}
            />
          )}
          {/* Mute Button */}
          <Button
            icon={
              playerState.muted ? <SpeakerMute20Filled /> : <Speaker220Filled />
            }
            appearance="transparent"
            title={playerState.muted ? "Unmute" : "Mute"}
            onClick={() => {
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
                flexItemStyles.grow,
                flexRowStyles.root,
                flexRowStyles.vAlignCenter,
                flexRowStyles.smallGap,
              )}
            >
              <Text size={300} weight="medium">
                {formatTimeValue(playerState.currentTime)}
                {" / "}
                {formatTimeValue(playerState.duration)}
              </Text>
              {suspended && (
                <Button
                  icon={<Live20Filled />}
                  appearance="outline"
                  size={"small"}
                  title={"Follow presenter"}
                  onClick={endSuspension}
                  style={{ marginLeft: "0.25rem" }}
                >
                  Follow presenter
                </Button>
              )}
            </div>
            <div
              className={mergeClasses(
                flexRowStyles.root,
                flexRowStyles.vAlignCenter,
                flexRowStyles.hAlignEnd
              )}
            >
              {!localUserIsPresenting && (
                <Button
                  appearance="outline"
                  size="small"
                  aria-label={`Take control`}
                  disabled={!localUserIsEligiblePresenter}
                  onClick={() => {
                    takeControl();
                    if (suspended) {
                      endSuspension();
                    }
                  }}
                >
                  {`Take control`}
                </Button>
              )}
              {localUserIsPresenting && (
                <Text size={300} weight="medium" align="end">
                  {"In control"}
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
