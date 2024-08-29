/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    LiveDataObjectInitializeState,
    UserMeetingRole,
} from "@microsoft/live-share";
import React from "react";
import {
    CoordinationWaitPoint,
    ExtendedMediaMetadata,
    IMediaPlayer,
    LiveMediaSession,
    MediaPlayerSynchronizer,
    MediaSessionCoordinatorSuspension,
} from "@microsoft/live-share-media";
import {
    isExtendedMediaMetadata,
    isMediaElement,
    isRefObject,
} from "../utils/index.js";
import { useDynamicDDS } from "../shared-hooks/index.js";
import { IUseMediaSynchronizerResults } from "../types/index.js";
import { useFluidObjectsContext } from "../providers/index.js";
import {
    ActionContainerNotJoinedError,
    ActionLiveDataObjectUndefinedError,
} from "../internal/index.js";

/**
 * React hook for using a Live Share media `MediaPlayerSynchronizer`.
 *
 * @remarks
 * Use this hook if you want to synchronize the playback position of a video or audio element during a Live Share session.
 * This hook can only be used in a child component of `<LiveShareProvider>` or `<AzureProvider>`.
 *
 * @param uniqueKey uniqueKey value for the `LiveMediaSession` DDS object used by `MediaPlayerSynchronizer`.
 * @param mediaPlayerElement React RefObject containing object/element conforming to IMediaPlayer interface, `IMediaPlayer` object, or string id for <video> / <audio> element.
 * @param initialTrack initial track to load. Either ExtendedMediaMetadata, trackId string, or null.
 * @param allowedRoles Optional. Array of user roles that are eligible to modify group playback state.
 * @param viewOnly Optional. Flag for whether or not the media synchronizer should be in viewOnly mode.
 * @param canSendPositionUpdates Optional. Controls whether or not the local client is allowed to send position updates to the group.
 * @returns IUseMediaSynchronizerResults object.
 * 
 * @example
 ```jsx
import { useMediaSynchronizer } from "@microsoft/live-share-react";
import { UserMeetingRole } from "@microsoft/live-share";
import { MediaPlayerSynchronizerEvents } from "@microsoft/live-share-media";
import { useRef, useEffect } from "react";

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];

const INITIAL_TRACK = "<YOUR_VIDEO_URL>";

// Define a unique key that distinguishes this `useMediaSynchronizer` from others in your app
const UNIQUE_KEY = "MEDIA-SESSION-ID";

export function VideoPlayer() {
  const videoRef = useRef(null);
  const { play, pause, seekTo, mediaSynchronizer } = useMediaSynchronizer(
    UNIQUE_KEY,
    videoRef,
    INITIAL_TRACK,
    ALLOWED_ROLES
  );

  // Listen for groupaction events (optional)
  useEffect(() => {
    // Listen for player group actions for errors (e.g., play error)
    const onGroupAction = (evt: IMediaPlayerSynchronizerEvent) => {
      // See which user made the change (e.g., to display a notification)
      const clientInfo = await synchronizer.mediaSession.getClientInfo(evt.details.clientId);
    };
    mediaSynchronizer?.addEventListener(
      MediaPlayerSynchronizerEvents.groupaction,
      onGroupAction
    );
    return () => {
      mediaSynchronizer?.removeEventListener(
        MediaPlayerSynchronizerEvents.groupaction,
        onGroupAction
      );
    };
  }, [mediaSynchronizer]);

  return (
    <div>
      <video ref={videoRef} />
      <button onClick={play}>
        Play
      </button>
      <button onClick={pause}>
        Pause
      </button>
      <button onClick={() => {
        seekTo(0);
      }}>
        Start over
      </button>
    </div>
  );
}
 ```
 */
export function useMediaSynchronizer(
    uniqueKey: string,
    mediaPlayerElement:
        | React.RefObject<IMediaPlayer>
        | IMediaPlayer
        | string
        | null,
    initialTrack: Partial<ExtendedMediaMetadata> | string | null,
    allowedRoles?: UserMeetingRole[],
    viewOnly?: boolean,
    canSendPositionUpdates?: boolean
): IUseMediaSynchronizerResults {
    /**
     * User facing media synchronizer and non-user facing setter
     */
    const [mediaSynchronizer, setMediaSynchronizer] = React.useState<
        MediaPlayerSynchronizer | undefined
    >();
    /**
     * Suspension object and setter
     */
    const [suspension, setSuspension] = React.useState<
        MediaSessionCoordinatorSuspension | undefined
    >();
    /**
     * User facing: dynamically load the LiveMediaSession DDS for the given unique key.
     */
    const { dds: mediaSession } = useDynamicDDS<LiveMediaSession>(
        uniqueKey,
        LiveMediaSession
    );

    const { container } = useFluidObjectsContext();

    /**
     * Play callback
     */
    const play = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError(
                "mediaSynchronizer",
                "play"
            );
        }
        if (mediaSynchronizer === undefined) {
            throw new ActionLiveDataObjectUndefinedError(
                "mediaSynchronizer",
                "play"
            );
        }
        return await mediaSynchronizer.play();
    }, [container, mediaSynchronizer]);

    /**
     * Pause callback
     */
    const pause = React.useCallback(async () => {
        if (!container) {
            throw new ActionContainerNotJoinedError(
                "mediaSynchronizer",
                "pause"
            );
        }
        if (mediaSynchronizer === undefined) {
            throw new ActionLiveDataObjectUndefinedError(
                "mediaSynchronizer",
                "pause"
            );
        }
        return await mediaSynchronizer.pause();
    }, [container, mediaSynchronizer]);

    /**
     * User facing: seek callback
     */
    const seekTo = React.useCallback(
        async (time: number) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "mediaSynchronizer",
                    "seekTo"
                );
            }
            if (mediaSynchronizer === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "mediaSynchronizer",
                    "seekTo"
                );
            }
            return await mediaSynchronizer.seekTo(time);
        },
        [container, mediaSynchronizer]
    );

    /**
     * User facing: set track callback
     */
    const setTrack = React.useCallback(
        async (track: Partial<ExtendedMediaMetadata> | string | null) => {
            if (!container) {
                throw new ActionContainerNotJoinedError(
                    "mediaSynchronizer",
                    "setTrack"
                );
            }
            if (mediaSynchronizer === undefined) {
                throw new ActionLiveDataObjectUndefinedError(
                    "mediaSynchronizer",
                    "setTrack"
                );
            }
            if (isExtendedMediaMetadata(track)) {
                return await mediaSynchronizer.setTrack(track);
            } else if (typeof track === "string") {
                return await mediaSynchronizer.setTrack({
                    trackIdentifier: track,
                } as ExtendedMediaMetadata);
            }
        },
        [container, mediaSynchronizer]
    );

    /**
     * User facing: create a new suspension and set it locally to state
     */
    const beginSuspension = React.useCallback(
        (waitPoint?: CoordinationWaitPoint) => {
            const suspension =
                mediaSession?.coordinator.beginSuspension(waitPoint);
            setSuspension(suspension);
        },
        [mediaSession]
    );

    /**
     * User facing: if a suspension is active, end it. Called when "Follow presenter" button is clicked.
     */
    const endSuspension = React.useCallback(() => {
        suspension?.end();
        setSuspension(undefined);
    }, [suspension]);

    /**
     * Setup change listeners and start `LiveMediaSession` if needed
     */
    React.useEffect(() => {
        if (mediaSession === undefined || !mediaPlayerElement) return;
        let mounted = true;
        // Query the HTML5 media element from the document and set reference
        let mediaPlayer: IMediaPlayer | undefined;
        if (isRefObject<IMediaPlayer>(mediaPlayerElement)) {
            if (!mediaPlayerElement.current) return;
            mediaPlayer = mediaPlayerElement.current;
        } else if (typeof mediaPlayerElement === "string") {
            const mediaElement = document.getElementById(
                mediaPlayerElement
            ) as any;
            if (!isMediaElement(mediaElement)) return;
            mediaPlayer = mediaElement;
        } else {
            mediaPlayer = mediaPlayerElement;
        }
        if (initialTrack) {
            // If supported type and not null, set the initial src
            if (isExtendedMediaMetadata(initialTrack)) {
                mediaPlayer.src = initialTrack.trackIdentifier;
            } else if (typeof initialTrack === "string") {
                mediaPlayer.src = initialTrack;
            }
        }
        // Begin synchronizing a MediaSynchronizer for the player
        const synchronizer = mediaSession.synchronize(mediaPlayer);
        if (viewOnly !== undefined) {
            // Set synchronizer to view only mode provided by developer
            synchronizer.viewOnly = viewOnly;
        }
        if (canSendPositionUpdates !== undefined) {
            synchronizer.mediaSession.coordinator.canSendPositionUpdates =
                canSendPositionUpdates;
        }

        if (
            mediaSession.initializeState ===
            LiveDataObjectInitializeState.needed
        ) {
            // Start synchronizing the media session
            mediaSession.initialize(allowedRoles ?? []);
        } else if (initialTrack) {
            mediaSession.onLocalUserAllowed(async () => {
                if (!mounted) return;
                try {
                    if (isExtendedMediaMetadata(initialTrack)) {
                        await synchronizer.setTrack(initialTrack);
                    } else if (typeof initialTrack === "string") {
                        await synchronizer.setTrack({
                            trackIdentifier: initialTrack,
                        } as ExtendedMediaMetadata);
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        }
        setMediaSynchronizer(synchronizer);

        return () => {
            mounted = false;
            synchronizer.removeAllListeners();
            mediaSession.removeAllListeners();
            synchronizer?.end();
            mediaSession?.dispose();
        };
    }, [mediaSession, mediaPlayerElement]);

    /**
     * Change view in media synchronizer only if prop changes
     */
    React.useEffect(() => {
        if (!mediaSynchronizer) return;
        if (viewOnly === undefined) return;
        if (mediaSynchronizer.viewOnly === viewOnly) return;
        mediaSynchronizer.viewOnly = viewOnly;
    }, [viewOnly, mediaSynchronizer?.viewOnly]);

    /**
     * Change canSendPositionUpdates when prop changes
     */
    React.useEffect(() => {
        if (!mediaSynchronizer) return;
        if (canSendPositionUpdates === undefined) return;
        if (
            mediaSynchronizer.mediaSession.coordinator
                .canSendPositionUpdates === canSendPositionUpdates
        )
            return;
        mediaSynchronizer.mediaSession.coordinator.canSendPositionUpdates =
            canSendPositionUpdates;
    }, [
        canSendPositionUpdates,
        mediaSynchronizer?.mediaSession.coordinator.canSendPositionUpdates,
    ]);

    return {
        suspended: !!suspension,
        mediaSynchronizer,
        play,
        pause,
        seekTo,
        setTrack,
        beginSuspension,
        endSuspension,
    };
}
