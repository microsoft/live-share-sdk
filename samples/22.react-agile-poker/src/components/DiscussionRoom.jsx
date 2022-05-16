/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useMemo } from "react";

// UI imports
import { Button, Text, Title1, mergeClasses } from "@fluentui/react-components";
import { getPrimaryButtonStyles } from "../styles/components";
import {
  getFlexColumnStyles,
  getFlexItemStyles,
  getFlexRowStyles,
} from "../styles/layout";
import { GameHeader } from "./GameHeader";
import { UserAnswer } from "./UserAnswer";

// UI to see if there is a consensus, and if not,
// discuss. Allows for a re-vote after discussion.
export const DiscussionRoom = ({
  localUserId,
  onStartCosting,
  onStartWaiting,
  users,
  userStory,
}) => {
  const flexRowStyles = getFlexRowStyles();
  const flexColumnStyles = getFlexColumnStyles();
  const flexItemStyles = getFlexItemStyles();
  const primaryButtonStyles = getPrimaryButtonStyles();

  const consensusMet = useMemo(() => {
    return users.every(
      (value, _, array) => array[0].data?.answer === value.data?.answer
    );
  }, [users]);

  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.fill,
        flexColumnStyles.smallGap
      )}
    >
      <GameHeader />
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.grow,
          flexColumnStyles.vAlignCenter,
          flexColumnStyles.hAlignCenter
        )}
        style={{ padding: "2rem" }}
      >
        <Title1 align="center">{userStory.text}</Title1>
      </div>
      <div
        className={mergeClasses(
          flexRowStyles.root,
          flexRowStyles.smallGap,
          flexItemStyles.grow,
          flexItemStyles.vAlignStart,
          flexRowStyles.wrap,
          flexRowStyles.vAlignCenter
        )}
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
      </div>
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.hAlignEnd,
          flexColumnStyles.smallGap
        )}
      >
        <Text align="start" weight="semibold" size={500}>
          {consensusMet ? "Consensus met!" : "No consensus met..."}
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
      </div>
    </div>
  );
};
