/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useRef, FC } from "react";
import * as liveShareHooks from "../live-share-hooks";
import {
    LiveNotifications,
    LiveSharePage,
    MediaPlayerContainer,
} from "../components";
import { AzureMediaPlayer } from "../utils/AzureMediaPlayer";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
import { LiveShareProvider } from "@microsoft/live-share-react";
import { AppConfiguration, IN_TEAMS } from "../constants";
import { LiveShareHost, app } from "@microsoft/teams-js";
import {
    ILiveShareClientOptions,
    TestLiveShareHost,
} from "@microsoft/live-share";
import {
    ISharingStatus,
    useSharingStatus,
} from "../teams-js-hooks/useSharingStatus";
import { getInitialMediaItem } from "../utils/media-list";

const LIVE_SHARE_OPTIONS: ILiveShareClientOptions = {
    canSendBackgroundUpdates: false, // default to false so we can wait to see
};

const MeetingStage: FC = () => {
    // Teams context
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

    // Render the media player
    return (
        <LiveShareProvider
            host={hostRef.current}
            joinOnLoad
            clientOptions={LIVE_SHARE_OPTIONS}
        >
            <div style={{ backgroundColor: "black" }}>
                {/* Live Share wrapper to show loading indicator before setup */}
                <LiveSharePage context={context}>
                    <MeetingStageContent
                        context={context!}
                        shareStatus={shareStatus}
                    />
                </LiveSharePage>
            </div>
        </LiveShareProvider>
    );
};

interface IMeetingStateContentProps {
    context: app.Context;
    shareStatus: ISharingStatus;
}

const SELECTED_MEDIA_ITEM = getInitialMediaItem();

const MeetingStageContent: FC<IMeetingStateContentProps> = ({
    context,
    shareStatus,
}) => {
    // Element ref for inking canvas
    const canvasRef = useRef<HTMLDivElement | null>(null);
    // Media player
    const [player, setPlayer] = useState<AzureMediaPlayer | null>(null);
    // Flag tracking whether player setup has started
    const playerSetupStarted = useRef(false);

    const { notificationToDisplay, displayNotification } =
        liveShareHooks.useNotifications();

    const threadId =
        context.meeting?.id ??
        context.chat?.id ??
        context.channel?.id ??
        "unknown";

    // Take control map
    const {
        localUserIsPresenting, // boolean that is true if local user is currently presenting
        localUserIsEligiblePresenter, // boolean that is true if the local user has the required roles to present
        takeControl, // callback method to take control of playback
    } = liveShareHooks.useTakeControl(
        threadId,
        shareStatus.isShareInitiator,
        displayNotification
    );

    // Media session hook
    const {
        suspended, // boolean that is true if synchronizer is suspended
        play, // callback method to synchronize a play action
        pause, // callback method to synchronize a pause action
        seekTo, // callback method to synchronize a seekTo action
        endSuspension, // callback method to end the synchronizer suspension
    } = liveShareHooks.useMediaSession(
        threadId,
        localUserIsPresenting,
        shareStatus.isShareInitiator,
        player,
        SELECTED_MEDIA_ITEM,
        displayNotification
    );

    // Set up the media player
    useEffect(() => {
        if (player || playerSetupStarted.current) return;
        playerSetupStarted.current = true;
        // Setup Azure Media Player
        const amp = new AzureMediaPlayer("video", SELECTED_MEDIA_ITEM.src);
        // Set player when AzureMediaPlayer is ready to go
        const onReady = () => {
            setPlayer(amp);
            amp.removeEventListener("ready", onReady);
        };
        amp.addEventListener("ready", onReady);
    }, [player, setPlayer]);

    return (
        <>
            {/* Display Notifications */}
            <LiveNotifications notificationToDisplay={notificationToDisplay} />
            {/* Media Player */}
            <MediaPlayerContainer
                player={player}
                localUserIsPresenting={localUserIsPresenting}
                localUserIsEligiblePresenter={localUserIsEligiblePresenter}
                suspended={suspended}
                canvasRef={canvasRef}
                play={play}
                pause={pause}
                seekTo={seekTo}
                takeControl={takeControl}
                endSuspension={endSuspension}
            >
                {/* // Render video */}
                <video
                    id="video"
                    className="azuremediaplayer amp-default-skin amp-big-play-centered"
                />
            </MediaPlayerContainer>
        </>
    );
};

export default MeetingStage;
