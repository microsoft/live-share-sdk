import { LivePresenceUser, PresenceState } from "@microsoft/live-share";
import { useLivePresence } from "@microsoft/live-share-react";
import { inTeams } from "../utils/inTeams";
import { FC } from "react";
import {
    AvatarGroup,
    AvatarGroupItem,
    AvatarGroupPopover,
    Button,
    Divider,
    Input,
    InputProps,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    PresenceBadgeStatus,
    Text,
    Tooltip,
    partitionAvatarGroupItems,
} from "@fluentui/react-components";
import { FlexColumn, FlexRow, MoreInformationText } from ".";

const IN_TEAMS = inTeams();

export interface IUserData {
    selection:
        | {
              start: number;
              end: number;
          }
        | undefined;
}

// Key to uniquely identify `LivePresence` DDS
export const PRESENCE_KEY = "PRESENCE_AVATARS";

export const LiveAvatars: FC = () => {
    const { allUsers, localUser, updatePresence } =
        useLivePresence<IUserData>(PRESENCE_KEY);
    const onlineOrAwayUsers = allUsers.filter(
        (user) =>
            user.displayName &&
            (user.state === PresenceState.online ||
                user.state === PresenceState.away)
    );
    const { inlineItems, overflowItems } = partitionAvatarGroupItems({
        items: onlineOrAwayUsers.map((user) => {
            const displayName = user.displayName ?? "Unknown";
            if (user.isLocalUser) {
                return displayName + " (You)";
            }
            return displayName;
        }),
        maxInlineItems: 3,
    });

    return (
        <FlexColumn vAlign="center" hAlign="center" gap="large">
            <AvatarGroup>
                {inlineItems.map((name, index) => {
                    const user = onlineOrAwayUsers[index];
                    return (
                        <Popover key={name} openOnHover mouseLeaveDelay={0}>
                            <PopoverTrigger disableButtonEnhancement>
                                <AvatarGroupItem
                                    name={name}
                                    badge={{
                                        status: presenceStateToFluentStatus(
                                            user
                                        ),
                                    }}
                                />
                            </PopoverTrigger>
                            <PopoverSurface>
                                <FlexColumn gap="smaller">
                                    <FlexRow>
                                        <Text weight="semibold">{name}</Text>
                                    </FlexRow>
                                </FlexColumn>
                            </PopoverSurface>
                        </Popover>
                    );
                })}

                {overflowItems && (
                    <AvatarGroupPopover>
                        {overflowItems.map((name) => (
                            <AvatarGroupItem
                                name={name}
                                key={name}
                                title={name}
                            />
                        ))}
                    </AvatarGroupPopover>
                )}
            </AvatarGroup>
        </FlexColumn>
    );
};

function presenceStateToFluentStatus(
    user: LivePresenceUser
): PresenceBadgeStatus {
    switch (user.state) {
        case PresenceState.online:
            return "available";
        case PresenceState.offline:
            return "offline";
        case PresenceState.away:
            return "away";
        default:
            return "offline";
    }
}
