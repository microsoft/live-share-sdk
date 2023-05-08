import { TestLiveShareHost, UserMeetingRole } from "@microsoft/live-share";
import { LiveShareProvider, useLiveShareContext } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { useState } from "react";
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
// If you want to test role validation locally, you can override the roles of remote/local users.
// This will only work well with a max of two clients.
if (host instanceof TestLiveShareHost) {
    const url = new URL(window.location.href);
    const scopes = url.searchParams.get("scopes");
    if (scopes === "read") {
        host.defaultLocalRoles = [
            UserMeetingRole.attendee
        ];
    } else if (scopes === "write") {
        host.defaultRemoteRoles = [
            UserMeetingRole.attendee
        ];
    }
}

export const LiveShareManualJoin = () => {
    return (
        <TeamsClientLoader>
            <LiveShareProvider host={host}>
                <RequireJoinWrapper />
            </LiveShareProvider>
        </TeamsClientLoader>
    );
};

// State options w/ text to display as the value
const JOIN_STATE_OPTIONS = {
    waiting: "Waiting to join...",
    loading: "Joining container...",
    done: "Joined!",
    error: "Error joining container: review console for more details",
}

// Component that renders different states depending on the status of joining the Live Share session
const RequireJoinWrapper = () => {
    const [joinState, setJoinState] = useState(JOIN_STATE_OPTIONS.waiting);
    const { join } = useLiveShareContext();

    const onJoin = async () => {
        if (joinState !== JOIN_STATE_OPTIONS.waiting) return;
        try {
            setJoinState(JOIN_STATE_OPTIONS.loading);
            await join();
            setJoinState(JOIN_STATE_OPTIONS.done);
        } catch (e) {
            console.error(e);
            setJoinState(JOIN_STATE_OPTIONS.error);
        }
    }

    return (
        <>
            {joinState === JOIN_STATE_OPTIONS.waiting && (
                <div>
                    <h1>
                        {joinState}
                    </h1>
                    <button onClick={onJoin}>
                        {"Join session"}
                    </button>
                </div>
            )}
            {joinState === JOIN_STATE_OPTIONS.loading && (
                <div>
                    <h1>
                        {joinState}
                    </h1>
                </div>
            )}
            {joinState === JOIN_STATE_OPTIONS.done && (
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
            )}
            {joinState === JOIN_STATE_OPTIONS.error && (
                <div>
                    <h1 style={{ color: "red" }}>
                        {joinState}
                    </h1>
                    <button onClick={window.location.reload}>{"Reload"}</button>
                </div>
            )}
        </>
    );
}
