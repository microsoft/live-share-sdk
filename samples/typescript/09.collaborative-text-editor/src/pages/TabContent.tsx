import { TestLiveShareHost } from "@microsoft/live-share";
import { LiveShareProvider } from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { FC, useState } from "react";
import { CollaborativeTextArea, FlexColumn, LiveAvatars } from "../components";

const IN_TEAMS = inTeams();

export const TabContent: FC = () => {
    const [host] = useState(
        IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create()
    );
    return (
        <LiveShareProvider joinOnLoad host={host}>
            <FlexColumn gap="small">
                <LiveAvatars />
                <CollaborativeTextArea />
            </FlexColumn>
        </LiveShareProvider>
    );
};
