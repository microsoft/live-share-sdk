import { TestLiveShareHost } from "@microsoft/live-share";
import { LiveShareProvider } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { ExampleLiveState } from "../components";
import { inTeams } from "../utils/inTeams";
import { FC, useState } from "react";
import { getInsecureTokenProvider } from "../utils/insecureTokenProvider";

const IN_TEAMS = inTeams();

export const LiveShareAutoJoin: FC = () => {
    const [host] = useState(
        IN_TEAMS
            ? LiveShareHost.create()
            : TestLiveShareHost.create(getInsecureTokenProvider())
    );
    return (
        <LiveShareProvider joinOnLoad host={host}>
            <ExampleLiveState />
        </LiveShareProvider>
    );
};
