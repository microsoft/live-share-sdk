/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState } from "react";
import { 
  EphemeralEvent, 
  EphemeralPresence, 
  EphemeralState, 
  TeamsFluidClient 
} from "@microsoft/live-share";
import { LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { DebugLogger } from "@fluidframework/telemetry-utils";
import { EphemeralTimer } from "@microsoft/live-share";
import { SharedMap } from "fluid-framework";
import { v4 as uuid } from "uuid";

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
    // Check if user is in Teams
    const searchParams = new URL(window.location).searchParams;
    const inTeams = !!searchParams.get("inTeams");

    let connection;
    if (!inTeams) {
      // Configure for local testing (optional).
      connection = {
        tenantId: LOCAL_MODE_TENANT_ID,
        tokenProvider: new InsecureTokenProvider("", { id: "123", name: "Test User" }),
        orderer: "http://localhost:7070",
        storage: "http://localhost:7070",
      }
    }

    // Define any additional client settings (optional).
    // - connection: A custom Fluid Relay Service connection to use.
    // - logger: A fluid logger to use.
    const clientProps = {
      connection,
      logger: DebugLogger.create("fluid:"),
    };
    // Enable debugger
    window.localStorage.debug = "fluid:*";

    // Define container initializer.
    // * This is only called once when the container is first created.
    const onFirstInitialize = (container) => {
      // Setup any initial state here
      const currentTime = EphemeralEvent.getTimestamp();
      container.initialObjects.userStoriesMap.set(uuid(), {
        text: "As a user, I can watch user testing videos together with my team.",
        addedAt: currentTime,
        addedBy: null,
      });
      container.initialObjects.userStoriesMap.set(uuid(), {
        text: "As a user, I can play agile poker with my team.",
        addedAt: currentTime,
        addedBy: null,
      });
    };

    // Define container schema
    const schema = {
      initialObjects: {
        pokerState: EphemeralState,
        presence: EphemeralPresence,
        timer: EphemeralTimer,
        userStoriesMap: SharedMap,
      },
    };

    // Join Teams container
    const client = new TeamsFluidClient(clientProps);
    client.joinContainer(schema, onFirstInitialize)
      .then((results) => setResults(results))
      .catch((err) => setError(err));
  }, []);

  const container = results?.container;
  const initialObjects = container?.initialObjects;
  return {
    pokerState: initialObjects?.pokerState,
    presence: initialObjects?.presence,
    timer: initialObjects?.timer,
    userStoriesMap: initialObjects?.userStoriesMap,
    container,
    error,
    services: results?.services,
  };
}
