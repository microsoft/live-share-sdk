/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Button, Text, Title1 } from "@fluentui/react-components";
import { getPrimaryButtonStyles } from "../styles/components";
import { GameHeader } from "./GameHeader";
import { UserAnswer } from "./UserAnswer";
import { FlexColumn, FlexItem, FlexRow } from "./flex";

// UI to see if there is a consensus, and if not,
// discuss. Allows for a re-vote after discussion.
export const DiscussionRoom = ({
    localUserId,
    onStartCosting,
    onStartWaiting,
    users,
    userStory,
}) => {
    const primaryButtonStyles = getPrimaryButtonStyles();

    const consensusMet = users.every(
        (value, _, array) => array[0].data?.answer === value.data?.answer
    );

    return (
        <FlexColumn fill="both" gap="small">
            <GameHeader />
            <FlexColumn
                fill="both"
                vAlign="center"
                hAlign="center"
                style={{ padding: "2rem" }}
            >
                <Title1 align="center">{userStory.text}</Title1>
            </FlexColumn>
            <FlexItem noShrink>
                <FlexRow
                    fill="width"
                    gap="small"
                    vAlign="start"
                    wrap
                    hAlign="center"
                    style={{ maxWidth: "80vw" }}
                >
                    {users.map((user, index) => (
                        <UserAnswer
                            key={`answer${user.userId}`}
                            user={user}
                            localUserId={localUserId}
                            index={index}
                        />
                    ))}
                </FlexRow>
            </FlexItem>
            <FlexItem noShrink>
                <FlexColumn hAlign="end" gap="small">
                    <Text align="start" weight="semibold" size={500}>
                        {consensusMet
                            ? "Consensus met!"
                            : "No consensus met..."}
                    </Text>
                    {consensusMet && (
                        <Button
                            className={primaryButtonStyles.button}
                            onClick={onStartWaiting}
                        >
                            Finish
                        </Button>
                    )}
                    {!consensusMet && (
                        <Button
                            className={primaryButtonStyles.button}
                            onClick={() => {
                                onStartCosting(userStory.id);
                            }}
                        >
                            Start over
                        </Button>
                    )}
                </FlexColumn>
            </FlexItem>
        </FlexColumn>
    );
};
