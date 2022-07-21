/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { EphemeralMediaSession } from "@microsoft/live-share-media";
import { SharedMap } from "fluid-framework";
import { useEffect, useState } from "react";
import {
  EphemeralEvent,
  EphemeralPresence,
  TeamsFluidClient,
} from "@microsoft/live-share";
import { mediaList } from "../utils/media-list";

/**
 * Hook that creates/loads the apps shared objects.
 *
 * @remarks
 * This is an application specific hook that defines the fluid schema of Distributed Data Structures (DDS)
 * used by the app and passes that schema to the `TeamsFluidClient` to create/load your Fluid container.
 *
 * @returns Shared objects managed by the apps fluid container.
 */
export function useSharedObjects() {
  const [results, setResults] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    console.log("useSharedObjects: starting");
    // Check if user is in Teams
    const url = window.location.href.includes("/#/")
      ? new URL(`${window.location.href.split("/#/").join("/")}`)
      : new URL(window.location);
    const inTeams = !!url.searchParams.get("inTeams");

    let connection;
    if (!inTeams) {
      // Configure for local testing (optional).
      console.warn("useSharedObjects: using a local Azure Fluid Relay test server.");
      connection = {
        type: 'local',
        tokenProvider: new InsecureTokenProvider("", { id: "123", name: "Test User" }),
        endpoint: "http://localhost:7070"
      };
    }

    // Define any additional client settings (optional).
    // - connection: A custom Fluid Relay Service connection to use.
    // - logger: A fluid logger to use.
    const clientProps = {
      connection,
    };

    // Enable debugger
    window.localStorage.debug = "fluid:*";

    // Define container callback (optional).
    // * This is only called once when the container is first created.
    const onFirstInitialize = (container) => {
      console.log("useSharedObjects: onFirstInitialize called");
      // Setup any initial state here
      mediaList.forEach((mediaItem) => {
        container.initialObjects.playlistMap.set(mediaItem.id, {
          ...mediaItem,
          timeAdded: EphemeralEvent.getTimestamp(),
        });
      });
      container.initialObjects.playlistMap.set(
        "selected-media-id",
        mediaList[0].id
      );
    };

    // Define container schema
    const schema = {
      initialObjects: {
        presence: EphemeralPresence,
        mediaSession: EphemeralMediaSession,
        notificationEvent: EphemeralEvent,
        inkEvent: EphemeralEvent,
        takeControlMap: SharedMap,
        playlistMap: SharedMap,
      },
    };

    // Create the client, join container, and set results
    console.log("useSharedObjects: joining container");
    const client = new TeamsFluidClient(clientProps);
    client
      .joinContainer(schema, onFirstInitialize)
      .then((results) => {
        console.log("useSharedObjects: joined container");
        setResults(results);
      })
      .catch((err) => setError(err));
  }, []);

  const container = results?.container;
  const initialObjects = container?.initialObjects;
  return {
    presence: initialObjects?.presence,
    mediaSession: initialObjects?.mediaSession,
    notificationEvent: initialObjects?.notificationEvent,
    takeControlMap: initialObjects?.takeControlMap,
    playlistMap: initialObjects?.playlistMap,
    inkEvent: initialObjects?.inkEvent,
    container,
    error,
    services: results?.services,
  };
}
