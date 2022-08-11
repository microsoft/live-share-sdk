/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Button, Text, Title1, mergeClasses } from "@fluentui/react-components";
import { getPrimaryButtonStyles } from "../styles/components";
import {
  getFlexColumnStyles,
  getFlexItemStyles,
  getFlexRowStyles,
} from "../styles/layout";
import { GameHeader } from "./GameHeader";
import { GameTimer } from "./GameTimer";
import { StoryPointCard } from "./StoryPointCard";

export const CostingGame = ({
  users,
  readyUsersCount,
  userStory,
  timerMilliRemaining,
  answer,
  setAnswer,
  changeReadyStatus,
}) => {
  const flexRowStyles = getFlexRowStyles();
  const flexColumnStyles = getFlexColumnStyles();
  const flexItemStyles = getFlexItemStyles();
  const primaryButtonStyles = getPrimaryButtonStyles();

  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.fill,
        flexColumnStyles.smallGap
      )}
    >
      <GameHeader
        timer={<GameTimer timerMilliRemaining={timerMilliRemaining} />}
      />
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.grow,
          flexColumnStyles.vAlignCenter,
          flexColumnStyles.hAlignCenter,
          flexItemStyles.grow
        )}
      >
        <Title1 align="center">{userStory.text}</Title1>
      </div>
      <div
        className={mergeClasses(
          flexRowStyles.root,
          flexRowStyles.vAlignCenter,
          flexRowStyles.hAlignEnd,
          flexRowStyles.smallGap
        )}
      >
        <div
          className={mergeClasses(
            flexItemStyles.grow,
            flexRowStyles.root,
            flexRowStyles.hAlignEnd
          )}
        >
          <Text
            align="end"
            weight="semibold"
            size={600}
          >{`${readyUsersCount}/${users.length} people are ready`}</Text>
        </div>
        <div>
          <Button
            disabled={!answer}
            className={primaryButtonStyles.button}
            onClick={() => {
              changeReadyStatus(true);
            }}
          >
            Submit
          </Button>
        </div>
      </div>
      <div
        className={mergeClasses(
          flexRowStyles.root,
          flexRowStyles.vAlignCenter,
          flexRowStyles.hAlignCenter,
          flexRowStyles.wrap,
          flexRowStyles.smallGap
        )}
      >
        {["0", "1", "2", "3", "5", "8", "13", "20"].map((value) => {
          return (
            <div
              key={`card${value}`}
              onClick={() => {
                setAnswer(value);
              }}
            >
              <StoryPointCard value={value} selectedValue={answer} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
