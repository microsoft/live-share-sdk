/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { mergeClasses, Subheadline } from "@fluentui/react-components";
import { getFlexColumnStyles, getFlexRowStyles } from "../styles/layout";
import { PlayerAvatar } from "./PlayerAvatar";

export const UserAnswer = ({ user, localUserId, index }) => {
  const flexRowStyles = getFlexRowStyles();
  const flexColumnStyles = getFlexColumnStyles();
  return (
    <div
      className={mergeClasses(
        flexRowStyles.root,
        flexRowStyles.vAlignCenter,
        flexRowStyles.smallGap
      )}
    >
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.hAlignCenter
        )}
      >
        <PlayerAvatar user={user} localUserId={localUserId} index={index} />
      </div>
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.vAlignCenter,
          flexColumnStyles.hAlignCenter
        )}
        style={{
          width: "4.4rem",
          height: "5.6rem",
          backgroundColor: "white",
          color: "black",
          borderRadius: "0.4rem",
          marginBottom: "0.8rem",
        }}
      >
        <Subheadline>{`${user.data?.answer ?? "N/A"}`}</Subheadline>
      </div>
    </div>
  );
};
