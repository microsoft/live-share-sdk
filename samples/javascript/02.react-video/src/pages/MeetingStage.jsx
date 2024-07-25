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
    // Started initializing flag
    const startedInitializingRef = useRef(false);
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
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // In production, you might consider using React Suspense if you are using React V18.
        // We are not doing this here because many customers are still using React V17.
        // We are monitoring the React Suspense situation closely and may revisit in the future.
        if (startedInitializingRef.current) return;
        startedInitializingRef.current = true;
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
                const { container } = await client.join(schema);
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
