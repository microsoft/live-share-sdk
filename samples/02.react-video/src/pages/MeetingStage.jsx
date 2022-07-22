/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useRef } from "react";
import { getVideoStyle } from "../styles/styles";
import { getInitialMediaItem } from "../utils/getInitialMediaItem";
import { MediaPlayerContainer } from "../components";
import { EphemeralMediaSession } from "@microsoft/live-share-media";
import { TeamsFluidClient } from "@microsoft/live-share";
import { inTeams } from "../utils/inTeams";
import { LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { ConsoleLogger } from "./ConsoleLogger";

const MeetingStage = () => {
  // Initial media item selected in SidePanel.jsx
  const initialMediaItem = useRef(getInitialMediaItem());
  // HTML5 <video> element ref
  const videoElement = useRef();
  // MediaSynchronizer ref
  const synchronizer = useRef();

  // Initial setup when context is returned
  useEffect(() => {
    (async function () {
      // Set the initial video src for the player element
      videoElement.current.src = initialMediaItem.current.src;
      // Browsers require a click before a video can be played automatically
      // Either capture a click or mute the audio by default
      videoElement.current.muted = true;

      let connection;
      if (!inTeams()) {
        // Configure for local testing (optional).
        connection = {
          tenantId: LOCAL_MODE_TENANT_ID,
          tokenProvider: new InsecureTokenProvider("", {
            id: "123",
            name: "Test User",
          }),
          orderer: "http://localhost:7070",
          storage: "http://localhost:7070",
        };
      }
      // Enable debugger
      window.localStorage.debug = "fluid:*";

      // Define Fluid document schema and create container
      const client = new TeamsFluidClient({
        connection,
        logger: new ConsoleLogger(),
      });
      const schema = {
        initialObjects: { mediaSession: EphemeralMediaSession },
      };
      const { container } = await client.joinContainer(schema);
      const { mediaSession } = container.initialObjects;
      synchronizer.current = mediaSession.synchronize(videoElement.current);
      await mediaSession.start();
    })();
  }, []);

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
