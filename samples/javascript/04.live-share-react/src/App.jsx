import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import {
    FluidContextProvider,
    LiveShareContextProvider,
} from "@microsoft/live-share-react";
import { inTeams } from "./utils/inTeams";
import { useRef } from "react";
import {
    ExampleLivePresence,
    ExampleSharedMap,
    ExampleLiveState,
    ExampleSharedState,
    ExampleMediaSynchronizer,
    ExampleLiveEvent,
    ExampleLiveCanvas,
    ExampleLiveTimer,
    EXAMPLE_SHARED_MAP_KEY,
} from "./components";
import { TeamsClientLoader } from "./components/TeamsClientLoader";
import { LiveShareHost } from "@microsoft/teams-js";
import { TestLiveShareHost } from "@microsoft/live-share";
import { SharedMap } from "fluid-framework";

const localConnection = {
    type: "local",
    tokenProvider: new InsecureTokenProvider("", {
        id: "123",
    }),
    endpoint: "http://localhost:7070",
};
const azureClientOptions = {
    connection: localConnection,
};
const host = inTeams() ? LiveShareHost.create() : TestLiveShareHost.create();

export default function App() {
    // set to false to use AzureClient Fluid container
    const shouldUseLiveShare = useRef(true);
    if (shouldUseLiveShare.current) {
        return (
            <TeamsClientLoader>
                <LiveShareContextProvider
                    joinOnLoad={true}
                    host={host}
                >
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
                </LiveShareContextProvider>
            </TeamsClientLoader>
        );
    }
    return (
        <FluidContextProvider
            clientOptions={azureClientOptions}
            createOnLoad={true}
            joinOnLoad={true}
            containerId={window.location.hash.substring(1)}
            initialObjects={{
                /**
                 * Optionally can defined custom objects and use them within their corresponding hook. See ExampleSharedMap to see
                 * how this works.
                 */
                [EXAMPLE_SHARED_MAP_KEY]: SharedMap,
            }}
        >
            <ExampleSharedState />
            <ExampleSharedMap />
        </FluidContextProvider>
    );
}
