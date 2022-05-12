/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { mergeClasses, Text } from "@fluentui/react-components";
import { getFlexColumnStyles } from "../styles/layout";
import nameShape1 from "../assets/name-shape-1.png";
import nameShape2 from "../assets/name-shape-2.png";
import { UserAuth } from "./UserAuth";
import { inTeams } from "../utils/inTeams";
const avatars = [
  require("../assets/avatar1.png"),
  require("../assets/avatar2.png"),
  require("../assets/avatar3.png"),
  require("../assets/avatar4.png"),
  require("../assets/avatar5.png"),
  require("../assets/avatar6.png"),
  require("../assets/avatar7.png"),
  require("../assets/avatar8.png"),
  require("../assets/avatar9.png"),
  require("../assets/avatar10.png"),
  require("../assets/avatar11.png"),
  require("../assets/avatar12.png"),
];

export const PlayerAvatar = ({ user, localUserId, index, onLogIn }) => {
  const flexColumnStyles = getFlexColumnStyles();
  const imageSrc = (index + 1) % 2 ? nameShape2 : nameShape1;
  const avatarIndex =
    user.data && user.data.avatarIndex >= 0 ? user.data.avatarIndex : 0;
  const avatarSrc = avatars[avatarIndex].default;
  const isLocal = user?.userId === localUserId;
  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.vAlignCenter,
        flexColumnStyles.smallGap
      )}
      style={{ padding: "12px" }}
    >
      <div
        style={{
          borderWidth: "5px",
          borderColor: "#FFD541",
          borderStyle: "solid",
          width: "92px",
          height: "92px",
          backgroundImage: `url(${avatarSrc})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          backgroundImage: `url(${imageSrc})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          marginTop: "-24px",
          width: "110px",
          height: "40px",
        }}
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.hAlignCenter,
          flexColumnStyles.vAlignCenter
        )}
      >
        <Text
          truncate
          align="center"
          weight="semibold"
          size={200}
          style={{ width: 100, overflow: "hidden", whiteSpace: "nowrap" }}
          title={user.data?.name || "Loading..."}
        >
          {`${user.data?.name}`}
        </Text>
      </div>
      {isLocal && inTeams() && <UserAuth onLogIn={onLogIn} />}
    </div>
  );
};
