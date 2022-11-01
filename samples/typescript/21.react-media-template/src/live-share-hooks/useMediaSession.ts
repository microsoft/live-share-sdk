/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { UserMeetingRole } from "@microsoft/live-share";
import {
    ExtendedMediaMetadata,
    LiveMediaSession,
    MediaPlayerSynchronizer,
    MediaSessionCoordinatorSuspension,
} from "@microsoft/live-share-media";
import { useState, useEffect, useCallback, useRef } from "react";
import { AzureMediaPlayer } from "../utils/AzureMediaPlayer";
import { inTeams } from "../utils/inTeams";
import * as microsoftTeams from "@microsoft/teams-js";
import { MediaItem } from "../utils/media-list";

/**
 * Hook that synchronizes a media element using MediaSynchronizer and LiveMediaSession
 *
 * @remarks
 * Works with any HTML5 <video> or <audio> element.
 * Must use custom media controls to intercept play, pause, and seek events.
 * Any pause/play/seek events not sent through the MediaSynchronizer will be blocked
 * while MediaSynchronizer is synchronizing.
 *
 * @param {LiveMediaSession} mediaSession media session object from Fluid container.
 * @param {MediaItem} selectedMediaItem selected media item from `usePlaylist` hook.
 * @param {AzureMediaPlayer} player amp player that matches <video> interface.
 * @param {boolean} localUserIsPresenting boolean when local user is presenting.
 * @param {UserMeetingRole[]} acceptPlaybackChangesFrom List of acceptable roles for playback transport commands.
 * @param {(text: string) => void} sendNotification Send notificaiton callback from `useNotification` hook.
 * @returns `{mediaSessionStarted, suspended, togglePlayPause, seek, setTrack, endSuspension}` where:
 * - `mediaSessionStarted` is a boolean indicating whether mediaSession.initialize() has been called.
 * - `suspended` is a flag indicating that the media synchronization is suspended.
 * - `play` is a callback method to play through the synchronizer.
 * - `pause` is a callback method to pause through the synchronizer.
 * - `seekTo` is a callback method to seek a video to a given timestamp (in seconds).
 * - `setTrack` is a callback method to change the selected track src.
 * - `endSuspension` is a callback method to end the active suspension.
 */
export const useMediaSession = (
    localUserIsPresenting: boolean,
    acceptPlaybackChangesFrom: UserMeetingRole[],
    sendNotification: (text: string) => void,
    mediaSession?: LiveMediaSession,
    selectedMediaItem?: MediaItem,
    player?: AzureMediaPlayer
) => {
    const synchronizerRef = useRef<MediaPlayerSynchronizer>();
    const [mediaSessionStarted, setStarted] = useState(false);
    const [suspension, setSuspension] =
        useState<MediaSessionCoordinatorSuspension>();

    // callback method to change the selected track src
    const setTrack = useCallback(
        async (trackId: string) => {
            if (localUserIsPresenting) {
                const metadata: ExtendedMediaMetadata = {
                    trackIdentifier: trackId,
                    liveStream: false,
                    album: "",
                    artist: "",
                    artwork: [],
                    title: selectedMediaItem ? selectedMediaItem?.title : "",
                };
                synchronizerRef.current?.setTrack(metadata);
                sendNotification(`changed the ${selectedMediaItem?.type}`);
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
            synchronizerRef.current?.play();
            sendNotification(`played the ${selectedMediaItem?.type}`);
        } else {
            // Stop following the presenter and play
            if (!suspension) {
                // Suspends media session coordinator until suspension is ended
                const newSuspension =
                    mediaSession?.coordinator.beginSuspension();
                setSuspension(newSuspension);
            }
            player?.play();
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
            synchronizerRef.current?.pause();
            sendNotification(`paused the ${selectedMediaItem?.type}`);
        } else {
            // Stop following the presenter and pause
            if (!suspension) {
                // Suspends media session coordinator until suspension is ended
                const newSuspension =
                    mediaSession?.coordinator.beginSuspension();
                setSuspension(newSuspension);
            }
            player?.pause();
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
        async (timestamp: number) => {
            if (localUserIsPresenting) {
                // Synchronize the seek action
                synchronizerRef.current?.seekTo(timestamp);
                sendNotification(`seeked the ${selectedMediaItem?.type}`);
            } else {
                // Stop following the presenter and seek
                if (!suspension) {
                    const newSuspension =
                        mediaSession?.coordinator.beginSuspension();
                    setSuspension(newSuspension);
                }
                if (player) {
                    player.currentTime = timestamp;
                }
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
        setSuspension(undefined);
    }, [suspension]);

    // effect that sets up the LiveMediaSession and MediaSynchronizer
    useEffect(() => {
        if (
            mediaSession &&
            !mediaSession.isInitialized &&
            !synchronizerRef.current &&
            selectedMediaItem &&
            player
        ) {
            console.log(
                "useSharedSynchronizer: setting up player for synchronizer"
            );
            // Query the HTML5 media element from the document and set initial src
            // Begin synchronizing a MediaSynchronizer for the player and set reference
            synchronizerRef.current = mediaSession.synchronize(player);

            // Default to viewOnly mode; this will get set to false for the current presenter below
            synchronizerRef.current.viewOnly = !localUserIsPresenting;

            // Start synchronizing the media session
            mediaSession.initialize(acceptPlaybackChangesFrom).then(() => {
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
                            if (speakingState.isSpeakingDetected) {
                                synchronizerRef.current?.volumeManager?.startLimiting();
                            } else {
                                synchronizerRef.current?.volumeManager?.stopLimiting();
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
            if (currentSrc && currentSrc === selectedMediaItem?.src) {
                return;
            }
            if (selectedMediaItem) {
                setTrack(selectedMediaItem.src);
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
