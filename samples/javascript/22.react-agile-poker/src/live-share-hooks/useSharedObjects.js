/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useRef } from "react";
import {
    LivePresence,
    LiveState,
    LiveShareClient,
    TestLiveShareHost,
} from "@microsoft/live-share";
import { LiveTimer } from "@microsoft/live-share";
import { SharedMap } from "fluid-framework";
import { getDefaultUserStories } from "../constants/default-user-stories";
import { LiveShareHost } from "@microsoft/teams-js";

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
    const startedRef = useRef(false);
    const [results, setResults] = useState();
    const [error, setError] = useState();

    useEffect(() => {
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // In production, you might consider using React Suspense if you are using React V18.
        // We are not doing this here because many customers are still using React V17.
        // We are monitoring the React Suspense situation closely and may revisit in the future.
        if (startedRef.current) return;
        startedRef.current = true;
        // Check if user is in Teams
        const url = window.location.href.includes("/#/")
            ? new URL(`${window.location.href.split("/#/").join("/")}`)
            : new URL(window.location);
        const inTeams = !!url.searchParams.get("inTeams");

        try {
            // Enable debugger
            window.localStorage.debug = "fluid:*";
        } catch (error) {
            // Some users or anonymous modes in browsers disable local storage
            console.error(error);
        }

        // Define container initializer.
        // * This is only called once when the container is first created.
        const onFirstInitialize = (container) => {
            // Setup any initial state here
            const defaultUserStories = getDefaultUserStories();
            defaultUserStories.forEach((userStory) => {
                container.initialObjects.userStoriesMap.set(
                    userStory.id,
                    userStory
                );
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

        // Create live share host
        const host = inTeams
            ? LiveShareHost.create()
            : TestLiveShareHost.create();

        // Join Teams container
        const client = new LiveShareClient(host);
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
        liveRuntime: results?.liveRuntime,
    };
}
