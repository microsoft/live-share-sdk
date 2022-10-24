/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { useNavigate } from "react-router-dom";
import { useSharedObjects, useUserStories } from "../live-share-hooks";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
// UI imports
import { Button, Text, Subtitle2 } from "@fluentui/react-components";
import { Card, CardFooter } from "@fluentui/react-components/unstable";
import { getFlexItemStyles } from "../styles/layout";
import * as UI from "../components";
import { LiveSharePage } from "../components/LiveSharePage";

const SidePanel = () => {
    const flexItemStyles = getFlexItemStyles();

    /** React router dom */
    const navigate = useNavigate();

    const context = useTeamsContext();
    const { container, userStoriesMap } = useSharedObjects();
    const { userStoriesStarted, userStories, addUserStory } = useUserStories(
        userStoriesMap,
        context?.user?.id
    );

    useEffect(() => {
        if (context?.page?.frameContext === "meetingStage") {
            navigate({
                pathname: "/",
                search: "?inTeams=true",
            });
        }
    }, [context, navigate]);

    return (
        <LiveSharePage
            context={context}
            container={container}
            started={userStoriesStarted}
        >
            <UI.FlexColumn scroll fill vAlignStart>
                {/** UI for adding a new User Story */}
                <UI.SidePanelAccordion>
                    <UI.AddUserStory addUserStory={addUserStory} />
                </UI.SidePanelAccordion>

                <UI.FlexColumn marginSpacer fill vAlignStart>
                    {/** UI list of User Stories */}
                    {userStories.map((userStory) => {
                        return (
                            <Card
                                key={userStory.id}
                                className={flexItemStyles.noShrink}
                            >
                                {/** TODO: remove <div> once <Card> issue resolved */}
                                <div>
                                    <Subtitle2>{userStory.text}</Subtitle2>
                                </div>
                                <CardFooter>
                                    {/** Display "Plan Together" button or user story points results */}
                                    {!userStory.points && (
                                        <Button
                                            appearance="outline"
                                            size="small"
                                            onClick={() => {
                                                if (inTeams()) {
                                                    microsoftTeams.meeting.shareAppContentToStage(
                                                        (error) => {
                                                            if (error) {
                                                                console.error(
                                                                    error
                                                                );
                                                            }
                                                        },
                                                        `${window.location.origin}/?inTeams=true&userStoryId=${userStory.id}`
                                                    );
                                                } else {
                                                    window.open(
                                                        window.location.href
                                                            .split("sidepanel")
                                                            .join(
                                                                `?userStoryId=${userStory.id}`
                                                            )
                                                    );
                                                }
                                            }}
                                        >
                                            Plan together
                                        </Button>
                                    )}
                                    {userStory.points && (
                                        <Text>{`${userStory.points} story points`}</Text>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </UI.FlexColumn>
            </UI.FlexColumn>
        </LiveSharePage>
    );
};

export default SidePanel;
