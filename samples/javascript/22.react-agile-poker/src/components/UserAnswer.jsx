/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Subtitle2 } from "@fluentui/react-components";
import { PlayerAvatar } from "./PlayerAvatar";
import { FlexColumn, FlexRow } from "./flex";

export const UserAnswer = ({ user, localUserId, index }) => {
    return (
        <FlexRow vAlign="center" gap="small">
            <FlexColumn hAlign="center">
                <PlayerAvatar
                    user={user}
                    localUserId={localUserId}
                    index={index}
                />
            </FlexColumn>
            <FlexColumn
                vAlign="center"
                hAlign="center"
                style={{
                    width: "4.4rem",
                    height: "5.6rem",
                    backgroundColor: "white",
                    color: "black",
                    borderRadius: "0.4rem",
                    marginBottom: "0.8rem",
                }}
            >
                <Subtitle2>{`${user.data?.answer ?? "N/A"}`}</Subtitle2>
            </FlexColumn>
        </FlexRow>
    );
};
