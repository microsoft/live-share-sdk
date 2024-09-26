/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FC, useCallback, useEffect, useRef } from "react";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
import { useNavigate } from "react-router-dom";
import { MediaItem, mediaList, searchList } from "../utils/media-list";
import { ListWrapper, LiveSharePage } from "../components";
import * as liveShareHooks from "../live-share-hooks";
import {
    ISharingStatus,
    useSharingStatus,
} from "../teams-js-hooks/useSharingStatus";
import { TabbedList } from "../components/TabbedList";
import { LiveShareHost, app, meeting } from "@microsoft/teams-js";
import {
    ILiveShareClientOptions,
    TestLiveShareHost,
} from "@microsoft/live-share";
import { AppConfiguration, IN_TEAMS } from "../constants";
import { LiveShareProvider } from "@microsoft/live-share-react";

const LIVE_SHARE_OPTIONS: ILiveShareClientOptions = {
    canSendBackgroundUpdates: false, // default to false so we can wait to see
};

const SidePanel: FC = () => {
    const context = useTeamsContext();
    const hostRef = useRef(
        IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create()
    );
    const shareStatus = useSharingStatus();
    if (!shareStatus) {
        return null;
    }
    // Set canSendBackgroundUpdates setting's initial value
    LIVE_SHARE_OPTIONS.canSendBackgroundUpdates =
        AppConfiguration.isFullyLargeMeetingOptimized
            ? shareStatus.isShareInitiator
            : true;

    return (
        <LiveShareProvider host={hostRef.current} joinOnLoad>
            <LiveSharePage context={context}>
                <SidePanelContent context={context} shareStatus={shareStatus} />
            </LiveSharePage>
        </LiveShareProvider>
    );
};

const SidePanelContent: FC<{
    context: app.Context | undefined;
    shareStatus: ISharingStatus;
}> = ({ context, shareStatus }) => {
    const navigate = useNavigate();

    // Playlist map
    const {
        playlistStarted, // boolean that is true once playlistMap listener is registered
        selectedMediaItem, // selected media item object, or undefined if unknown
        mediaItems,
        addMediaItem,
        removeMediaItem,
        selectMediaId,
    } = liveShareHooks.usePlaylist();

    useEffect(() => {
        if (context && playlistStarted && IN_TEAMS) {
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
            // Set the selected media ID in the playlist map
            selectMediaId(mediaItem.id);
            if (IN_TEAMS) {
                // If not already sharing to stage, share to stage
                if (!shareStatus?.isAppSharing) {
                    meeting.shareAppContentToStage((error) => {
                        if (error) {
                            console.error(error);
                        }
                    }, `${window.location.origin}/?inTeams=true`);
                }
            } else {
                // When testing locally, open in a new browser tab
                // window.open(`${window.location.origin}/`);
            }
        },
        [shareStatus?.isAppSharing, selectMediaId]
    );

    return (
        <ListWrapper>
            <TabbedList
                mediaItems={mediaItems}
                browseItems={searchList}
                sharingActive={!!shareStatus?.isAppSharing}
                nowPlayingId={selectedMediaItem?.id}
                addMediaItem={addMediaItem}
                removeMediaItem={removeMediaItem}
                selectMedia={selectMedia}
            />
        </ListWrapper>
    );
};

export default SidePanel;
