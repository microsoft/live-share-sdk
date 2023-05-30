/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FC, useCallback, useEffect } from "react";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
import { useNavigate } from "react-router-dom";
import * as microsoftTeams from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { MediaItem, mediaList, searchList } from "../utils/media-list";
import { ListWrapper, LiveSharePage } from "../components";
import * as liveShareHooks from "../live-share-hooks";
import { useSharingStatus } from "../teams-js-hooks/useSharingStatus";
import { TabbedList } from "../components/TabbedList";
import { ACCEPT_PLAYBACK_CHANGES_FROM } from "../constants/allowed-roles";
import React from "react";

const SidePanel: FC = () => {
    const context = useTeamsContext();
    const sharingActive = useSharingStatus(context);
    const navigate = useNavigate();

    const {
        container,
        playlistMap,
        notificationEvent,
        presence,
        takeControlMap,
        timestampProvider,
    } = liveShareHooks.useSharedObjects();

    const { notificationStarted, sendNotification } =
        liveShareHooks.useNotifications(notificationEvent, context);

    const { presenceStarted, localUser, users, localUserIsEligiblePresenter } =
        liveShareHooks.usePresence(
            ACCEPT_PLAYBACK_CHANGES_FROM,
            presence,
            context,
            timestampProvider,
        );

    const { takeControlStarted, takeControl } = liveShareHooks.useTakeControl(
        localUserIsEligiblePresenter,
        users,
        takeControlMap,
        localUser?.userId,
        timestampProvider
    );

    const {
        playlistStarted,
        mediaItems,
        selectedMediaItem,
        selectMediaId,
        addMediaItem,
        removeMediaItem,
    } = liveShareHooks.usePlaylist(sendNotification, playlistMap);

    useEffect(() => {
        if (context && playlistStarted && inTeams()) {
            if (context.page?.frameContext === "meetingStage") {
                // User shared the app directly to stage, redirect automatically
                selectMediaId(mediaList[0].id);
                navigate({
                    pathname: "/",
                    search: `?inTeams=true`,
                });
            }
        }
    }, [context, playlistStarted, navigate, selectMediaId]);

    const selectMedia = useCallback(
        (mediaItem: MediaItem) => {
            // Take control
            takeControl();
            // Set the selected media ID in the playlist map
            selectMediaId(mediaItem.id);
            if (inTeams()) {
                // If not already sharing to stage, share to stage
                if (!sharingActive) {
                    microsoftTeams.meeting.shareAppContentToStage((error) => {
                        if (error) {
                            console.error(error);
                        }
                    }, `${window.location.origin}/?inTeams=true`);
                }
            } else {
                // When testing locally, open in a new browser tab
                window.open(`${window.location.origin}/`);
            }
        },
        [sharingActive, selectMediaId, takeControl]
    );

    const started = [
        notificationStarted,
        presenceStarted,
        takeControlStarted,
        playlistStarted,
    ].every((value) => value === true);

    return (
        <LiveSharePage
            context={context}
            container={container}
            started={started}
        >
            <ListWrapper>
                <TabbedList
                    mediaItems={mediaItems}
                    browseItems={searchList}
                    sharingActive={sharingActive}
                    nowPlayingId={selectedMediaItem?.id}
                    addMediaItem={addMediaItem}
                    removeMediaItem={removeMediaItem}
                    selectMedia={selectMedia}
                />
            </ListWrapper>
        </LiveSharePage>
    );
};

export default SidePanel;
