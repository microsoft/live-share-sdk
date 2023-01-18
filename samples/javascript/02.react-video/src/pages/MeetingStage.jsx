/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useRef, useState } from "react";
import { getVideoStyle } from "../styles/styles";
import { getInitialMediaItem } from "../utils/getInitialMediaItem";
import { DisplayError, MediaPlayerContainer } from "../components";
import {
    LiveMediaSession,
    MediaPlayerSynchronizerEvents,
} from "@microsoft/live-share-media";
import { LiveShareClient, TestLiveShareHost } from "@microsoft/live-share";
import { inTeams } from "../utils/inTeams";
import { ConsoleLogger } from "./ConsoleLogger";
import { LiveShareHost } from "@microsoft/teams-js";

const MeetingStage = () => {
    // Initial media item selected in SidePanel.jsx
    const initialMediaItem = useRef(getInitialMediaItem());
    // HTML5 <video> element ref
    const videoElement = useRef();
    // MediaSynchronizer ref
    const synchronizer = useRef();
    // Join error
    const [error, setError] = useState();

    // Initial setup when context is returned
    useEffect(() => {
        (async function () {
            try {
                // Set the initial video src for the player element
                videoElement.current.src = initialMediaItem.current.src;

                try {
                    // Enable debugger
                    window.localStorage.debug = "fluid:*";
                } catch (error) {
                    // Some users or anonymous modes in browsers disable local storage
                    console.error(error);
                }

                // Are we in teams?
                const host = inTeams()
                    ? LiveShareHost.create()
                    : TestLiveShareHost.create();

                // Define Fluid document schema and create container
                const client = new LiveShareClient(host, {
                    logger: new ConsoleLogger(),
                });
                const schema = {
                    initialObjects: { mediaSession: LiveMediaSession },
                };
                const { container } = await client.joinContainer(schema);
                const { mediaSession } = container.initialObjects;
                synchronizer.current = mediaSession.synchronize(
                    videoElement.current
                );
                synchronizer.current.addEventListener(
                    MediaPlayerSynchronizerEvents.groupaction,
                    (evt) => {
                        if (
                            evt.details.action === "play" &&
                            evt.error?.name === "NotAllowedError"
                        ) {
                            // The user has not interacted with the document so the browser blocked the play action
                            // mute the player and try again
                            synchronizer.current.player.muted = true;
                            synchronizer.current.player.play();
                        } else if (evt.error) {
                            console.error(evt.error);
                        }
                    }
                );
                await mediaSession.initialize();
            } catch (err) {
                setError(err);
            }
        })();
    });

    // When a user clicks play, call play in synchronizer
    const play = () => {
        synchronizer.current?.play();
    };

    // When a user clicks pause, call pause in synchronizer
    const pause = () => {
        synchronizer.current?.pause();
    };

    // When a user seeks, call seekTo in synchronizer
    const seekTo = (timestamp) => {
        synchronizer.current?.seekTo(timestamp);
    };

    if (error) {
        console.error(error);
        return <DisplayError error={error} />;
    }

    // Render the media player
    const videoStyle = getVideoStyle();
    return (
        <MediaPlayerContainer
            onUserPlay={play}
            onUserPause={pause}
            onUserSeekTo={seekTo}
        >
            <video
                id="player"
                ref={videoElement}
                poster={initialMediaItem.current.thumbnailImage}
                className={videoStyle.root}
            />
        </MediaPlayerContainer>
    );
};

export default MeetingStage;
