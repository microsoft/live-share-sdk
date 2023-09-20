import {
    LivePresenceUser,
    PresenceState,
    TestLiveShareHost,
} from "@microsoft/live-share";
import {
    LiveShareProvider,
    useLivePresence,
} from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { FC, useState } from "react";
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
import { FlexColumn, FlexRow, MoreInformationText } from "../components";

const IN_TEAMS = inTeams();

export const TabContent: FC = () => {
    const [host] = useState(
        IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create()
    );
    return (
        <LiveShareProvider joinOnLoad host={host}>
            <LiveAvatars />
        </LiveShareProvider>
    );
};

interface IUserData {
    favoriteFood: string | undefined;
}

// Key to uniquely identify `LivePresence` DDS
const PRESENCE_KEY = "PRESENCE_AVATARS";

const LiveAvatars: FC = () => {
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

    const onChangeFavoriteFood: InputProps["onChange"] = (ev, data) => {
        updatePresence(
            {
                favoriteFood: data.value,
            },
            localUser?.state
        );
    };

    return (
        <FlexColumn fill="both" vAlign="center" hAlign="center" gap="large">
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
                                    <Divider />
                                    <FlexRow>
                                        <Text weight="semibold" size={200}>
                                            Favorite food:
                                        </Text>
                                    </FlexRow>
                                    <FlexRow>
                                        <Text>
                                            {user.data?.favoriteFood ?? "N/A"}
                                        </Text>
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
            <Button
                onClick={() => {
                    updatePresence(
                        undefined,
                        localUser?.state === PresenceState.online
                            ? PresenceState.away
                            : PresenceState.online
                    );
                }}
            >
                Toggle status
            </Button>
            <Input
                value={localUser?.data?.favoriteFood}
                placeholder="Enter your favorite food..."
                onChange={onChangeFavoriteFood}
                style={{
                    width: "80%",
                }}
            />
            <MoreInformationText />
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
