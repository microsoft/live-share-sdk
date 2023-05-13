/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Button,
    Subtitle2,
    Image,
} from "@fluentui/react-components";
import logo from "../assets/agile-poker-logo-large.png";
import { getPrimaryButtonStyles } from "../styles/components";
import { PlayerAvatar } from "./PlayerAvatar";
import { FlexColumn, FlexRow } from "./flex";

export const WaitingRoom = ({
    localUserId,
    onStartCosting,
    users,
    userStory,
}) => {
    const primaryButtonStyles = getPrimaryButtonStyles();
    return (
        <FlexRow
            vAlign="center"
            fill="both"
        >
            <FlexColumn
                vAlign="center"
                fill="both"
                style={{ maxWidth: "376px" }}
            >
                <Image width={376} src={logo} />
                <FlexColumn
                    fill="both"
                    vAlign="center"
                    hAlign="center"
                    gap="small"
                >
                    <Button
                        className={primaryButtonStyles.button}
                        disabled={!userStory}
                        title={"Start game!"}
                        onClick={() => {
                            if (!userStory) {
                                throw Error(
                                    "WaitingRoom: No user story selected"
                                );
                            }
                            onStartCosting(userStory.id);
                        }}
                    >
                        Start game!
                    </Button>
                    <Subtitle2 align="center">
                        {"When everyone's ready!"}
                    </Subtitle2>
                </FlexColumn>
            </FlexColumn>
            <FlexRow
                vAlign="start"
                wrap
                style={{
                    padding: "5rem 7rem",
                }}
            >
                {users.map((user, index) => (
                    <div key={user.userId} style={{ padding: "24px" }}>
                        <PlayerAvatar
                            user={user}
                            localUserId={localUserId}
                            index={index}
                        />
                    </div>
                ))}
            </FlexRow>
        </FlexRow>
    );
};
