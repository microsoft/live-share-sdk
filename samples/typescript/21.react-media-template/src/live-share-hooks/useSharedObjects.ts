/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ILiveShareJoinResults,
    LiveShareClient,
    TestLiveShareHost,
    LiveEvent,
    LivePresence,
} from "@microsoft/live-share";
import { LiveCanvas } from "@microsoft/live-share-canvas";
import { LiveMediaSession } from "@microsoft/live-share-media";
import { IFluidContainer, SharedMap } from "fluid-framework";
import { useEffect, useState, useRef } from "react";
import { mediaList } from "../utils/media-list";
import { LiveShareHost } from "@microsoft/teams-js";
import { IUserData } from "./usePresence";

interface IUseSharedObjectsResult extends Partial<ILiveShareJoinResults> {
    presence: LivePresence<IUserData> | undefined,
    mediaSession: LiveMediaSession
        | undefined,
    notificationEvent: LiveEvent
        | undefined,
    takeControlMap: SharedMap | undefined,
    playlistMap: SharedMap | undefined,
    inkEvent: LiveEvent | undefined,
    liveCanvas: LiveCanvas | undefined,
    error: Error | undefined,
}

/**
 * Hook that creates/loads the apps shared objects.
 *
 * @remarks
 * This is an application specific hook that defines the fluid schema of Distributed Data Structures (DDS)
 * used by the app and passes that schema to the `LiveShareClient` to create/load your Fluid container.
 *
 * @returns Shared objects managed by the apps fluid container.
 */
export function useSharedObjects(): IUseSharedObjectsResult {
    const startedRef = useRef(false);
    const [results, setResults] = useState<ILiveShareJoinResults>();
    const [error, setError] = useState();

    useEffect(() => {
        // This hook should only be called once, so we use a ref to track if it has been called.
        // This is a workaround for the fact that useEffect is called twice on initial render in React V18.
        // In production, you might consider using React Suspense if you are using React V18.
        // We are not doing this here because many customers are still using React V17.
        // We are monitoring the React Suspense situation closely and may revisit in the future.
        if (startedRef.current) return;
        startedRef.current = true;
        console.log("useSharedObjects: starting");
        // Check if user is in Teams
        const url = window.location.href.includes("/#/")
            ? new URL(`${window.location.href.split("/#/").join("/")}`)
            : new URL(window.location.href);
        const inTeams = !!url.searchParams.get("inTeams");

        try {
            // Enable debugger
            window.localStorage.debug = "fluid:*";
        } catch (error) {
            // Some users or anonymous modes in browsers disable local storage
            console.error(error);
        }

        // Define container callback (optional).
        // * This is only called once when the container is first created.
        const onFirstInitialize = (container: IFluidContainer) => {
            console.log("useSharedObjects: onFirstInitialize called");
            // Setup any initial state here
            const playlistMap = container.initialObjects
                .playlistMap as SharedMap;
            mediaList.forEach((mediaItem) => {
                playlistMap.set(mediaItem.id, {
                    ...mediaItem,
                    timeAdded: 0,
                });
            });
            playlistMap.set("selected-media-id", mediaList[0].id);
        };

        // Define container schema
        const schema = {
            initialObjects: {
                presence: LivePresence<IUserData>,
                mediaSession: LiveMediaSession,
                notificationEvent: LiveEvent,
                liveCanvas: LiveCanvas,
                takeControlMap: SharedMap,
                playlistMap: SharedMap,
                inkEvent: LiveEvent,
            },
        };

        // Create live share host
        const host = inTeams
            ? LiveShareHost.create()
            : TestLiveShareHost.create();

        // Create the client, join container, and set results
        console.log("useSharedObjects: joining container");
        const client = new LiveShareClient(host);
        client
            .joinContainer(schema, onFirstInitialize)
            .then((results) => {
                console.log("useSharedObjects: joined container");
                setResults(results);
            })
            .catch((err) => {
                console.error(err);
                setError(err);
            });
    }, []);

    const container = results?.container;
    const initialObjects = container?.initialObjects;
    return {
        presence: initialObjects?.presence as LivePresence<IUserData> | undefined,
        mediaSession: initialObjects?.mediaSession as
            | LiveMediaSession
            | undefined,
        notificationEvent: initialObjects?.notificationEvent as
            | LiveEvent
            | undefined,
        takeControlMap: initialObjects?.takeControlMap as SharedMap | undefined,
        playlistMap: initialObjects?.playlistMap as SharedMap | undefined,
        inkEvent: initialObjects?.inkEvent as LiveEvent | undefined,
        liveCanvas: initialObjects?.liveCanvas as LiveCanvas | undefined,
        container,
        error,
        services: results?.services,
        timestampProvider: results?.timestampProvider,
    };
}
