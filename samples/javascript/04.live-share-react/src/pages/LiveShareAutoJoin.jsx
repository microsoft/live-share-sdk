import { TestLiveShareHost } from "@microsoft/live-share";
import { LiveShareProvider } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import {
    ExampleLiveCanvas,
    ExampleLiveEvent,
    ExampleLivePresence,
    ExampleLiveState,
    ExampleLiveTimer,
    ExampleMediaSynchronizer,
    ExampleSharedMap,
    ExampleSharedState,
    TeamsClientLoader,
} from "../components";
import { inTeams } from "../utils/inTeams";
import { useRef, useState } from "react";

const IN_TEAMS = inTeams();

export const LiveShareAutoJoin = () => {
    const hostRef = useRef(IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create());
    return (
        <LiveShareProvider joinOnLoad host={hostRef.current}>
            <ExampleLiveState
                waitingContent={
                    <>
                        <ExampleMediaSynchronizer />
                        <ExampleLiveEvent />
                        <ExampleLiveCanvas />
                    </>
                }
                startContent={
                    <>
                        <ExampleLiveTimer />
                        <ExampleSharedState />
                        <ExampleLivePresence />
                        <ExampleSharedMap />
                    </>
                }
            />
        </LiveShareProvider>
    );
};
