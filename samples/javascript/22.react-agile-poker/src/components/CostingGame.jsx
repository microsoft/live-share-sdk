/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Button, Text, Title1 } from "@fluentui/react-components";
import { getPrimaryButtonStyles } from "../styles/components";
import { GameHeader } from "./GameHeader";
import { GameTimer } from "./GameTimer";
import { StoryPointCard } from "./StoryPointCard";
import { FlexRow, FlexColumn, FlexItem } from "./flex";

export const CostingGame = ({
    users,
    readyUsersCount,
    userStory,
    timerMilliRemaining,
    answer,
    setAnswer,
    changeReadyStatus,
}) => {
    const primaryButtonStyles = getPrimaryButtonStyles();

    return (
        <FlexColumn fill="both" gap="medium">
            <GameHeader
                timer={<GameTimer timerMilliRemaining={timerMilliRemaining} />}
            />
            <FlexColumn fill="both" vAlign="center" hAlign="center">
                <Title1 align="center">{userStory.text}</Title1>
            </FlexColumn>
            <FlexRow vAlign="center" hAlign="end" gap="small" spaceBetween>
                <Text
                    align="end"
                    weight="semibold"
                    size={600}
                >{`${readyUsersCount}/${users.length} people are ready`}</Text>
                <Button
                    disabled={!answer}
                    className={primaryButtonStyles.button}
                    onClick={() => {
                        changeReadyStatus(true);
                    }}
                >
                    Submit
                </Button>
            </FlexRow>
            <FlexItem noShrink>
                <FlexRow
                    vAlign="center"
                    hAlign="center"
                    wrap
                    gap="small"
                >
                    {["0", "1", "2", "3", "5", "8", "13", "20"].map((value) => {
                        return (
                            <div
                                key={`card${value}`}
                                onClick={() => {
                                    setAnswer(value);
                                }}
                            >
                                <StoryPointCard
                                    value={value}
                                    selectedValue={answer}
                                />
                            </div>
                        );
                    })}
                </FlexRow>
            </FlexItem>
        </FlexColumn>
    );
};
