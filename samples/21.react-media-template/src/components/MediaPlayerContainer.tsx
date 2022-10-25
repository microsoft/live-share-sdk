/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback, FC, MutableRefObject, ReactNode } from "react";
import PlayerProgressBar from "./PlayerProgressBar";
import { formatTimeValue } from "../utils/format";
import {
  Pause24Filled,
  Play24Filled,
  SpeakerMute20Filled,
  Speaker220Filled,
  Next20Filled,
  Info24Regular,
} from "@fluentui/react-icons";
import { debounce } from "lodash";
import {
  mergeClasses,
  Button,
  Text,
  Popover,
  PopoverTrigger,
  PopoverSurface,
} from "@fluentui/react-components";
import {
  getFlexColumnStyles,
  getFlexItemStyles,
  getFlexRowStyles,
} from "../styles/layouts";
import { getPlayerControlStyles, getVideoStyle } from "../styles/styles";
import { InkCanvas } from "./InkCanvas";
import { InkingControls } from "./InkingControls";
import { AzureMediaPlayer } from "../utils/AzureMediaPlayer";
import { InkingManager } from "@microsoft/live-share-canvas";

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

interface PlayerState {
  isPlaying: boolean, 
  playbackStarted: boolean, 
  duration: number, 
  currentTime: number, 
  muted: boolean, 
  volume: number, 
  currentPlaybackBitrate?: number, 
  currentHeuristicProfile: undefined, 
  resolution?: string
}

export interface MediaPlayerContainerProps {
  player?: AzureMediaPlayer;
  localUserIsPresenting: boolean;
  localUserIsEligiblePresenter: boolean;
  suspended: boolean;
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  takeControl: () => void;
  endSuspension: () => void;
  nextTrack: () => void; // todo?
  canvasRef: MutableRefObject<HTMLDivElement | undefined>;
  inkingManager?: InkingManager;
  children: ReactNode;
}

export const MediaPlayerContainer: FC<MediaPlayerContainerProps> = ({
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
  canvasRef,
  inkingManager,
  children,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [inkActive, setInkActive] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    playbackStarted: false,
    duration: 0,
    currentTime: 0,
    muted: false,
    volume: 1,
    currentPlaybackBitrate: undefined,
    currentHeuristicProfile: undefined,
    resolution: undefined,
  });

  const hideControls = useCallback(() => {
    setShowControls(false);
  }, [setShowControls]);
  // eslint-disable-next-line
  const debouncedHideControls = useCallback(debounce(hideControls, 2500), [
    hideControls,
  ]);

  const togglePlayPause = useCallback(() => {
    if (!player) {
      return;
    }
    if (player.paused) {
      play();
    } else {
      pause();
    }
  }, [player, play, pause]);

  useEffect(() => {
    if (!localUserIsPresenting) {
      // Disable ink
      setInkActive(false);
    }
  }, [localUserIsPresenting, setInkActive]);

  useEffect(() => {
    const onPlayerStateUpdate = () => {
      if (!player) {
        return;
      }
      setPlayerState({
        isPlaying: !player.paused,
        playbackStarted: player.currentTime > 0,
        duration: player.duration || 0,
        currentTime: player.currentTime || 0,
        muted: player.muted,
        volume: player.volume,
        currentPlaybackBitrate: player.currentPlaybackBitrate,
        currentHeuristicProfile: player.currentHeuristicProfile,
        resolution: player.resolution,
      });
    };

    if (player) {
      // Add event listeners to player
      console.log("CustomControls: listening to player state changes");
      events.forEach((evt) => {
        player.addEventListener(evt, onPlayerStateUpdate);
      });
    }

    return () => {
      events.forEach((evt) => {
        player?.removeEventListener(evt, onPlayerStateUpdate);
      });
    };
  }, [player]);

  useEffect(() => {
    if (player && togglePlayPause) {
      document.body.onkeyup = function (e) {
        e.preventDefault();
        if (e.key === " " || e.code === "Space") {
          togglePlayPause();
        }
      };
    }
  }, [player, togglePlayPause]);

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
      { 
        inkingManager && <InkCanvas
          canvasRef={canvasRef}
          isEnabled={inkActive}
          inkingManager={inkingManager}
        />
      }
      <div
        className={flexColumnStyles.root}
        style={{
          position: "absolute",
          left: "0",
          bottom: "0",
          right: "0",
          zIndex: 2,
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
          style={{
            paddingBottom: "12px",
            paddingLeft: "12px",
            paddingRight: "12px",
            paddingTop: "0px",
            minWidth: "0px",
          }}
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
              if (player) {
                player.muted = !playerState.muted;
              }
            }}
          />
          <div
            className={mergeClasses(
              flexRowStyles.root,
              flexRowStyles.vAlignCenter,
              flexRowStyles.fill
            )}
          >
            <div
              className={mergeClasses(
                flexItemStyles.noShrink,
                flexItemStyles.grow,
                flexRowStyles.root,
                flexRowStyles.vAlignCenter,
                flexRowStyles.smallGap
              )}
            >
              {/* Formatted Time Value */}
              <Text size={300} weight="medium">
                {formatTimeValue(playerState.currentTime)}
                {" / "}
                {formatTimeValue(playerState.duration)}
              </Text>
              {/* Suspended */}
              {suspended && (
                <Button
                  appearance="outline"
                  title={"Sync to Presenter"}
                  onClick={endSuspension}
                  style={{ marginLeft: "0.25rem", borderColor: "#6e0811" }}
                >
                  <div
                    className={mergeClasses(
                      flexRowStyles.root,
                      flexRowStyles.vAlignCenter,
                      flexRowStyles.smallGap
                    )}
                  >
                    <div
                      className={mergeClasses(
                        flexRowStyles.root,
                        flexRowStyles.vAlignCenter
                      )}
                      style={{
                        padding: "0.05rem 0.5rem",
                        backgroundColor: "#c50f1f",
                        borderRadius: "8px",
                        height: "auto",
                      }}
                    >
                      <Text size={100} weight="medium">
                        {`LIVE`}
                      </Text>
                    </div>
                    <div>{`Sync to Presenter`}</div>
                  </div>
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
              {/* Take Control */}
              <Button
                appearance="outline"
                aria-label={
                  localUserIsPresenting ? `In control` : `Take control`
                }
                disabled={
                  localUserIsPresenting || !localUserIsEligiblePresenter
                }
                onClick={() => {
                  takeControl();
                  if (suspended) {
                    endSuspension();
                  }
                }}
              >
                <div
                  style={{
                    color: "white",
                    fontWeight: localUserIsPresenting ? 300 : undefined,
                    opacity: localUserIsPresenting ? "0.7" : "1",
                  }}
                >
                  {localUserIsPresenting ? `In control` : `Take control`}
                </div>
              </Button>
              {/* Divider */}
              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: "white",
                  opacity: "0.6",
                  marginLeft: "12px",
                  marginRight: "4px",
                }}
              />
              {/* Ink Toggle */}
              {localUserIsPresenting && inkingManager && (
                <InkingControls
                  inkingManager={inkingManager}
                  isEnabled={inkActive}
                  setIsEnabled={setInkActive}
                />
              )}
              {/* Info Popover */}
              <Popover>
                <PopoverTrigger>
                  <Button
                    icon={<Info24Regular />}
                    appearance="transparent"
                    title={"Info"}
                  />
                </PopoverTrigger>
                <PopoverSurface aria-label="video info">
                  <div className={mergeClasses(flexColumnStyles.root)}>
                    {playerState.currentPlaybackBitrate && (
                      <div>
                        <Text size={300}>
                          {`Bitrate: ${
                            playerState.currentPlaybackBitrate / 1000
                          }kbps`}
                        </Text>
                      </div>
                    )}
                    <div>
                      <Text size={300}>
                        {`Resolution: ${playerState.resolution}`}
                      </Text>
                    </div>
                    <div>
                      <Text size={300}>
                        {`Heuristic Profile: ${playerState.currentHeuristicProfile}`}
                      </Text>
                    </div>
                    <div>
                      <Text size={300}>{`Volume: ${playerState.volume}`}</Text>
                    </div>
                  </div>
                </PopoverSurface>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
