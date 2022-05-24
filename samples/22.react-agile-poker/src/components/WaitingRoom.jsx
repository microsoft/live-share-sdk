/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
  Button,
  Subtitle2,
  Image,
  mergeClasses,
} from "@fluentui/react-components";
import {
  getFlexColumnStyles,
  getFlexItemStyles,
  getFlexRowStyles,
} from "../styles/layout";
import logo from "../assets/agile-poker-logo-large.png";
import { getPrimaryButtonStyles } from "../styles/components";
import { PlayerAvatar } from "./PlayerAvatar";

export const WaitingRoom = ({
  localUserId,
  onStartCosting,
  users,
  userStory,
}) => {
  const flexRowStyles = getFlexRowStyles();
  const flexColumnStyles = getFlexColumnStyles();
  const flexItemStyles = getFlexItemStyles();
  const primaryButtonStyles = getPrimaryButtonStyles();
  return (
    <div
      className={mergeClasses(
        flexRowStyles.root,
        flexRowStyles.vAlignStart,
        flexRowStyles.fill
      )}
    >
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.vAlignCenter,
          flexColumnStyles.fill
        )}
        style={{ maxWidth: "376px" }}
      >
        <Image width={376} src={logo} />
        <div
          className={mergeClasses(
            flexColumnStyles.root,
            flexColumnStyles.vAlignCenter,
            flexColumnStyles.hAlignCenter,
            flexColumnStyles.smallGap,
            flexItemStyles.grow
          )}
        >
          <Button
            className={primaryButtonStyles.button}
            disabled={!userStory}
            title={"Start game!"}
            onClick={() => {
              if (!userStory) {
                throw Error("WaitingRoom: No user story selected");
              }
              onStartCosting(userStory.id);
            }}
          >
            Start game!
          </Button>
          <Subtitle2 align="center">{"When everyone's ready!"}</Subtitle2>
        </div>
      </div>
      <div
        className={mergeClasses(
          flexRowStyles.root,
          flexRowStyles.vAlignStart,
          flexRowStyles.wrap
        )}
        style={{
          padding: "5rem 7rem",
        }}
      >
        {users.map((user, index) => (
          <div key={user.userId} style={{ padding: "24px" }}>
            <PlayerAvatar user={user} localUserId={localUserId} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
};
