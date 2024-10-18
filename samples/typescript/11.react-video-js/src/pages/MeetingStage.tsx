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
// import { AzureMediaPlayer } from "../utils/AzureMediaPlayer";
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
import videojs from "video.js";
import { VideoJSDelegate } from "../utils/VideoJSDelegate";
import "video.js/dist/video-js.css";

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

const SELECTED_MEDIA_ITEM =
    "https://storage.googleapis.com/media-session/big-buck-bunny/trailer.mov";

const MeetingStageContent: FC<IMeetingStateContentProps> = ({
    context,
    shareStatus,
}) => {
    // Element ref for inking canvas
    const canvasRef = useRef<HTMLDivElement | null>(null);
    // Media player
    const [player, setPlayer] = useState<VideoJSDelegate | null>(null);
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
        const options: any = {
            src: "https://storage.googleapis.com/media-session/big-buck-bunny/trailer.mov",
            preload: "auto",
            poster: "https://images4.alphacoders.com/247/247356.jpg",
            sources: [
                {
                    src: "https://storage.googleapis.com/media-session/big-buck-bunny/trailer.mov",
                    type: "video/mp4",
                },
            ],
            controls: true,
            controlBar: {
                lockShowing: true,
            },
        };
        videojs("video", options, function () {
            const videojsDelegate = new VideoJSDelegate(this);
            setPlayer(videojsDelegate);
        });
    }, [player, setPlayer]);

    useEffect(() => {
        if (!player) return;
        const controlBar = player.getChild("controlBar");
        const children = player.children();
        if (children.length === 0) return;
        const videoEl = children[0];
        const unsubscribes: Function[] = [];
        const togglePlayPause = () => {
            // inverse because we assume the state already changed by the time this emits
            if (!player.paused) {
                play().catch((err) => console.error(err));
            } else {
                pause().catch((err) => console.error(err));
            }
        };
        videoEl.onclick = togglePlayPause;
        unsubscribes.push(() => {
            videoEl.onclick = undefined;
        });

        const poster = player.getChild("PosterImage");
        if (poster) {
            poster.on("click", togglePlayPause);
            unsubscribes.push(() => {
                poster.off("click", togglePlayPause);
            });
        }

        if (controlBar) {
            const playToggle = controlBar.getChild("playToggle");
            if (playToggle) {
                playToggle.on("click", togglePlayPause);
                unsubscribes.push(() => {
                    playToggle.off("click", togglePlayPause);
                });
            }
            const progressControl = controlBar.getChild("ProgressControl");
            if (progressControl) {
                const handler = (evt: any) => {
                    seekTo(player.currentTime).catch((err) =>
                        console.error(err)
                    );
                };
                progressControl.on("mouseup", handler);
                progressControl.on("touchend", handler);
                unsubscribes.push(() => {
                    progressControl.off("mouseup", handler);
                    progressControl.off("touchend", handler);
                });
            }
        }
        const bigPlayButton = player.getChild("BigPlayButton");
        if (bigPlayButton) {
            const handler = (evt: any) => {
                play();
                evt.stopPropagation();
            };
            bigPlayButton.on("click", handler);
            unsubscribes.push(() => {
                bigPlayButton.off("click", handler);
            });
        }

        return () => {
            unsubscribes.forEach((unsub) => unsub());
        };
    }, [player, play, pause, seekTo]);

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
                takeControl={takeControl}
                endSuspension={endSuspension}
            >
                {/* // Render video */}
                <video id="video" className="video-js" />
            </MediaPlayerContainer>
        </>
    );
};

export default MeetingStage;
