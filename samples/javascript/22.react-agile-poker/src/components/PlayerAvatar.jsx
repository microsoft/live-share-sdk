/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { mergeClasses, Text } from "@fluentui/react-components";
import { getFlexColumnStyles } from "../styles/layout";
import nameShape1 from "../assets/name-shape-1.png";
import nameShape2 from "../assets/name-shape-2.png";
import avatar1 from "../assets/avatar1.png";
import avatar2 from "../assets/avatar2.png";
import avatar3 from "../assets/avatar3.png";
import avatar4 from "../assets/avatar4.png";
import avatar5 from "../assets/avatar5.png";
import avatar6 from "../assets/avatar6.png";
import avatar7 from "../assets/avatar7.png";
import avatar8 from "../assets/avatar8.png";
import avatar9 from "../assets/avatar9.png";
import avatar10 from "../assets/avatar10.png";
import avatar11 from "../assets/avatar11.png";
import avatar12 from "../assets/avatar12.png";

const avatars = [
    avatar1,
    avatar2,
    avatar3,
    avatar4,
    avatar5,
    avatar6,
    avatar7,
    avatar8,
    avatar9,
    avatar10,
    avatar11,
    avatar12,
];

export const PlayerAvatar = ({ user, index }) => {
    const flexColumnStyles = getFlexColumnStyles();
    const imageSrc = (index + 1) % 2 ? nameShape2 : nameShape1;
    const avatarIndex =
        user.data && user.data.avatarIndex >= 0 ? user.data.avatarIndex : 0;
    const avatarSrc = avatars[avatarIndex];
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
                    style={{
                        width: 100,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                    }}
                    title={user.name || "Loading..."}
                >
                    {`${user.name}`}
                </Text>
            </div>
        </div>
    );
};
