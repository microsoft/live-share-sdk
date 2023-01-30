/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { UserMeetingRole } from "@microsoft/live-share";
import React from "react";
import {
    CoordinationWaitPoint,
    ExtendedMediaMetadata,
    IMediaPlayer,
    MediaPlayerSynchronizer,
    MediaSessionCoordinatorSuspension,
} from "@microsoft/live-share-media";
import { isExtendedMediaMetadata, isMediaElement, isRefObject } from "../utils";
import { useDynamicDDS } from "../shared-hooks";
import { IUseMediaSynchronizerResults } from "../types";
import { useFluidObjectsContext } from "../providers";
import { TurboLiveMediaSession } from "@microsoft/live-share-turbo";

/**
 * React hook for using a Live Share media `MediaPlayerSynchronizer`.
 *
 * @remarks
 * Use this hook if you want to synchronize the playback position of a video or audio element during a Live Share session.
 *
 * @param uniqueKey uniqueKey value for the `LiveMediaSession` DDS object used by `MediaPlayerSynchronizer`.
 * @param mediaPlayerElementRef React RefObject containing object/element conforming to IMediaPlayer interface or string id for <video> / <audio> element.
 * @param initialTrack initial track to load. Either ExtendedMediaMetadata, trackId string, or null.
 * @param allowedRoles Optional. Array of user roles that are eligible to modify group playback state.
 * @param viewOnly Optional. Flag for whether or not the media synchronizer should be in viewOnly mode.
 * @returns IUseMediaSynchronizerResults object.
 */
export function useMediaSynchronizer(
    uniqueKey: string,
    mediaPlayerElementRef: React.RefObject<IMediaPlayer> | string,
    initialTrack: Partial<ExtendedMediaMetadata> | string | null,
    allowedRoles?: UserMeetingRole[],
    viewOnly?: boolean
): IUseMediaSynchronizerResults {
    /**
     * Reference boolean for whether hook has registered "listening" events for `LiveEvent`.
     */
    const listeningRef = React.useRef(false);
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

    const { clientRef } = useFluidObjectsContext();

    const getDDS = React.useCallback((): Promise<TurboLiveMediaSession> => {
        return TurboLiveMediaSession.create(clientRef.current, uniqueKey);
    }, [uniqueKey]);
    /**
     * User facing: dynamically load the TurboLiveMediaSession DDS for the given unique key.
     */
    const { dds: mediaSession } = useDynamicDDS<TurboLiveMediaSession>(getDDS);

    /**
     * User facing: play callback
     */
    const play = React.useCallback((): void => {
        mediaSynchronizer?.play();
    }, [mediaSynchronizer]);

    /**
     * User facing: pause callback
     */
    const pause = React.useCallback((): void => {
        mediaSynchronizer?.pause();
    }, [mediaSynchronizer]);

    /**
     * User facing: seek callback
     */
    const seekTo = React.useCallback(
        (time: number): void => {
            mediaSynchronizer?.seekTo(time);
        },
        [mediaSynchronizer]
    );

    /**
     * User facing: set track callback
     */
    const setTrack = React.useCallback(
        (track: Partial<ExtendedMediaMetadata> | string | null): void => {
            // TODO: fix force unwrap once synchronizer uses correct types
            if (isExtendedMediaMetadata(track)) {
                mediaSynchronizer!.setTrack(track);
            } else if (typeof track === "string") {
                mediaSynchronizer!.setTrack({
                    trackIdentifier: track,
                } as ExtendedMediaMetadata);
            }
        },
        [mediaSynchronizer]
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
        if (listeningRef.current || mediaSession?.isInitialized === undefined || !mediaPlayerElementRef)
            return;
        // Query the HTML5 media element from the document and set reference
        let mediaPlayer: IMediaPlayer | undefined;
        if (isRefObject<IMediaPlayer>(mediaPlayerElementRef)) {
            if (!mediaPlayerElementRef.current) return;
            mediaPlayer = mediaPlayerElementRef.current;
        } else {
            const mediaPlayerElement = document.getElementById(
                mediaPlayerElementRef
            ) as any;
            if (!isMediaElement(mediaPlayerElement)) return;
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
        listeningRef.current = true;
        if (viewOnly !== undefined) {
            // Set synchronizer to view only mode provided by developer
            synchronizer.viewOnly = viewOnly;
        }

        if (!mediaSession.isInitialized) {
            // Start synchronizing the media session
            mediaSession.initialize(allowedRoles ?? []);
        } else if (initialTrack) {
            // If we have already started the media session, the synchronizer won't have initial track
            // data now that we are remounting.
            // TODO: if player is loaded twice in one app at once, then this has a chance to disrupt the
            // group state by resetting the track. MediaPlayerSynchronizer does not currently have a way to
            // get the current track, so to fix this we need a better solution.
            if (isExtendedMediaMetadata(initialTrack)) {
                synchronizer.setTrack(initialTrack);
            } else if (typeof initialTrack === "string") {
                synchronizer.setTrack({
                    trackIdentifier: initialTrack,
                } as ExtendedMediaMetadata);
            }
        }
        setMediaSynchronizer(synchronizer);

        return () => {
            listeningRef.current = false;
            synchronizer.removeAllListeners();
            mediaSession.removeAllListeners();
            synchronizer?.end();
        };
    }, [mediaSession?.isInitialized]);

    /**
     * Change view in media synchronizer only if prop changes
     */
    React.useEffect(() => {
        if (
            mediaSynchronizer?.viewOnly !== undefined &&
            viewOnly !== undefined &&
            mediaSynchronizer.viewOnly !== viewOnly
        ) {
            mediaSynchronizer.viewOnly = !!viewOnly;
        }
    }, [viewOnly, mediaSynchronizer?.viewOnly]);

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
