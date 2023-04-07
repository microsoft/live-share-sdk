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

const IN_TEAMS = inTeams();
const host = IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create();

export const LiveShareAutoJoin = () => {
    return (
        <TeamsClientLoader>
            <LiveShareProvider joinOnLoad host={host}>
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
        </TeamsClientLoader>
    );
};
