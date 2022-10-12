/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState } from "react";
import { LivePresence, LiveState, LiveShareClient } from "@microsoft/live-share";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { LiveTimer } from "@microsoft/live-share";
import { SharedMap } from "fluid-framework";
import { getDefaultUserStories } from "../constants/default-user-stories";

/**
 * Hook that creates/loads the apps shared objects.
 *
 * @remarks
 * This is an application specific hook that defines the fluid schema of Distributed Data Structures (DDS)
 * used by the app and passes that schema to the `LiveShareClient` to create/load your Fluid container.
 *
 * @returns Shared objects managed by the apps fluid container.
 */
export function useSharedObjects() {
    const [results, setResults] = useState();
    const [error, setError] = useState();

    useEffect(() => {
        // Check if user is in Teams
        const url = window.location.href.includes("/#/")
            ? new URL(`${window.location.href.split("/#/").join("/")}`)
            : new URL(window.location);
        const inTeams = !!url.searchParams.get("inTeams");

        let connection;
        if (!inTeams) {
            // Configure for local testing (optional).
            connection = {
                type: "local",
                tokenProvider: new InsecureTokenProvider("", { id: "123", name: "Test User" }),
                endpoint: "http://localhost:7070",
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

        // Define container initializer.
        // * This is only called once when the container is first created.
        const onFirstInitialize = (container) => {
            // Setup any initial state here
            const defaultUserStories = getDefaultUserStories();
            defaultUserStories.forEach((userStory) => {
                container.initialObjects.userStoriesMap.set(userStory.id, userStory);
            });
        };

        // Define container schema
        const schema = {
            initialObjects: {
                pokerState: LiveState,
                presence: LivePresence,
                timer: LiveTimer,
                userStoriesMap: SharedMap,
            },
        };

        // Join Teams container
        const client = new LiveShareClient(clientProps);
        client
            .joinContainer(schema, onFirstInitialize)
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
