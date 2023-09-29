import {
    FollowModeType,
    IFollowModePresenceUserData,
    IFollowModeState,
    LivePresenceUser,
    PresenceState,
} from "@microsoft/live-share";
import { FC, ReactElement } from "react";
import { ICustomFollowData } from "../pages";
import {
    AvatarGroup,
    AvatarGroupItem,
    AvatarGroupPopover,
    Button,
    Divider,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    PresenceBadgeStatus,
    Text,
    partitionAvatarGroupItems,
} from "@fluentui/react-components";
import { FlexColumn, FlexRow } from "./flex";

interface ILiveAvatarsProps {
    allUsers: LivePresenceUser<
        IFollowModePresenceUserData<ICustomFollowData | undefined>
    >[];
    remoteCameraState: IFollowModeState<ICustomFollowData | undefined>;
    onFollowUser: (userId: string) => Promise<void>;
}

const MAX_INLINE_ITEMS = 4;

export const LiveAvatars: FC<ILiveAvatarsProps> = ({
    allUsers,
    remoteCameraState,
    onFollowUser,
}) => {
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
        maxInlineItems: MAX_INLINE_ITEMS,
    });

    return (
        <AvatarGroup>
            {inlineItems.map((name, index) => {
                const user = onlineOrAwayUsers[index];
                return (
                    <AvatarItemPopover
                        key={name}
                        name={name}
                        user={user}
                        remoteCameraState={remoteCameraState}
                        onFollowUser={onFollowUser}
                    >
                        <AvatarGroupItem
                            name={name}
                            badge={{
                                status: presenceStateToFluentStatus(user),
                            }}
                        />
                    </AvatarItemPopover>
                );
            })}

            {overflowItems && (
                <AvatarGroupPopover>
                    {overflowItems.map((name, index) => (
                        <AvatarItemPopover
                            key={name}
                            name={name}
                            user={
                                onlineOrAwayUsers[
                                    index + (MAX_INLINE_ITEMS - 1)
                                ]
                            }
                            remoteCameraState={remoteCameraState}
                            onFollowUser={onFollowUser}
                        >
                            <AvatarGroupItem name={name} title={name} />
                        </AvatarItemPopover>
                    ))}
                </AvatarGroupPopover>
            )}
        </AvatarGroup>
    );
};

interface IAvatarPopoverProps {
    name: string;
    user: LivePresenceUser<
        IFollowModePresenceUserData<ICustomFollowData | undefined>
    >;
    remoteCameraState: IFollowModeState<ICustomFollowData | undefined>;
    children: ReactElement<any, any> | null;
    onFollowUser: (userId: string) => Promise<void>;
}
const AvatarItemPopover: FC<IAvatarPopoverProps> = ({
    name,
    user,
    remoteCameraState,
    children,
    onFollowUser,
}) => {
    const isFollowingUser = remoteCameraState.followingUserId === user.userId;
    return (
        <Popover openOnHover mouseLeaveDelay={0}>
            <PopoverTrigger disableButtonEnhancement>{children}</PopoverTrigger>
            <PopoverSurface>
                <FlexColumn gap="smaller">
                    <FlexRow>
                        <Text weight="semibold">{name}</Text>
                    </FlexRow>
                    <Divider />
                    {isFollowingUser && (
                        <FlexRow>
                            <Text weight="semibold" size={200}>
                                {remoteCameraState.type ===
                                FollowModeType.followPresenter
                                    ? "Presenting"
                                    : "Following"}
                            </Text>
                        </FlexRow>
                    )}
                    {!isFollowingUser && !user.isLocalUser && (
                        <FlexRow>
                            <Button
                                disabled={[
                                    FollowModeType.activePresenter,
                                    FollowModeType.followPresenter,
                                    FollowModeType.suspendFollowPresenter,
                                ].includes(remoteCameraState.type)}
                                onClick={() => {
                                    onFollowUser(user.userId);
                                }}
                            >
                                {"Follow"}
                            </Button>
                        </FlexRow>
                    )}
                </FlexColumn>
            </PopoverSurface>
        </Popover>
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
