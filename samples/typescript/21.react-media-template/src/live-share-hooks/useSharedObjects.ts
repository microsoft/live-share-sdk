/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ILiveShareClientOptions,
    LiveShareClient,
} from "@microsoft/live-share";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { LiveCanvas } from "@microsoft/live-share-canvas";
import { LiveMediaSession } from "@microsoft/live-share-media";
import { IFluidContainer, SharedMap } from "fluid-framework";
import { useEffect, useState } from "react";
import { LiveEvent, LivePresence } from "@microsoft/live-share";
import { mediaList } from "../utils/media-list";
import {
    AzureConnectionConfig,
    AzureContainerServices,
} from "@fluidframework/azure-client";

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
    const [results, setResults] = useState<{
        container: IFluidContainer;
        services: AzureContainerServices;
        created: boolean;
    }>();
    const [error, setError] = useState();

    useEffect(() => {
        console.log("useSharedObjects: starting");
        // Check if user is in Teams
        const url = window.location.href.includes("/#/")
            ? new URL(`${window.location.href.split("/#/").join("/")}`)
            : new URL(window.location.href);
        const inTeams = !!url.searchParams.get("inTeams");

        let connection: AzureConnectionConfig | undefined;
        if (!inTeams) {
            // Configure for local testing (optional).
            connection = {
                type: "local",
                tokenProvider: new InsecureTokenProvider("", { id: "123" }),
                endpoint: "http://localhost:7070",
            };
        }

        // Define any additional client settings (optional).
        // - connection: A custom Fluid Relay Service connection to use.
        // - logger: A fluid logger to use.
        const clientProps: ILiveShareClientOptions = {
            connection,
        };

        // To reset the stored container-id, uncomment below:
        // localStorage.clear();

        // Enable debugger
        window.localStorage.debug = "fluid:*";

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
                    timeAdded: LiveEvent.getTimestamp(),
                });
            });
            playlistMap.set("selected-media-id", mediaList[0].id);
        };

        // Define container schema
        const schema = {
            initialObjects: {
                presence: LivePresence,
                mediaSession: LiveMediaSession,
                notificationEvent: LiveEvent,
                liveCanvas: LiveCanvas,
                takeControlMap: SharedMap,
                playlistMap: SharedMap,
                inkEvent: LiveEvent,
            },
        };

        // Create the client, join container, and set results
        console.log("useSharedObjects: joining container");
        const client = new LiveShareClient(clientProps);
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
        presence: initialObjects?.presence as LivePresence | undefined,
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
    };
}
