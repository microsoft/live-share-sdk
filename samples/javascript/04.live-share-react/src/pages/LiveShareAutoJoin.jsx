import { TestLiveShareHost } from "@microsoft/live-share";
import {
    LiveShareProvider,
    useLiveShareContext,
} from "@microsoft/live-share-react";
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
} from "../components";
import { inTeams } from "../utils/inTeams";
import { useRef } from "react";

const IN_TEAMS = inTeams();

export const LiveShareAutoJoin = () => {
    const hostRef = useRef(
        IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create()
    );
    return (
        <LiveShareProvider joinOnLoad host={hostRef.current}>
            <LiveShareAutoJoinRenderer />
        </LiveShareProvider>
    );
};

const LiveShareAutoJoinRenderer = () => {
    // Get the join state from `useLiveShareContext`
    const { joined, joinError } = useLiveShareContext();
    if (joinError) {
        return <div>{joinError?.message}</div>;
    }
    if (!joined) {
        return <div>{"Loading..."}</div>;
    }
    return (
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
    );
};
