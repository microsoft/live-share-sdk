import { useLiveFollowMode } from "@microsoft/live-share-react";
import { FC } from "react";
import { ALLOWED_ROLES, ICustomFollowData } from "../pages";
import { Text, tokens } from "@fluentui/react-components";
import { FollowModeType } from "@microsoft/live-share";

export const FollowModeInfoText: FC = () => {
    /**
     * Following state to track which camera position to display.
     * We could pass this as a prop to FollowModeInfoText, but showing here to show that it is optional.
     * As long as the unique key is the same in components using this hook, the values will be in sync.
     */
    const {
        localUser,
        allUsers,
        state: remoteCameraState,
        liveFollowMode,
    } = useLiveFollowMode<ICustomFollowData | undefined>(
        "FOLLOW_MODE",
        undefined,
        ALLOWED_ROLES
    );
    // Get the list of users following the current followed user
    const followers =
        liveFollowMode && remoteCameraState?.followingUserId
            ? liveFollowMode.getUserFollowers(remoteCameraState.followingUserId)
            : [];
    const localFollowers =
        liveFollowMode &&
        localUser &&
        remoteCameraState?.type === FollowModeType.activeFollowers
            ? liveFollowMode.getUserFollowers(localUser.userId)
            : [];
    const followingUser = remoteCameraState?.followingUserId
        ? liveFollowMode?.getUser(remoteCameraState.followingUserId)
        : undefined;
    function getTextToDisplay(): string {
        if (!remoteCameraState) {
            throw new Error(
                "FollowModeInfoText getTextInfoDisplay(): this function should not be called if remoteCameraState is null"
            );
        }
        switch (remoteCameraState.type) {
            case FollowModeType.activePresenter: {
                if (allUsers.length !== 1) {
                    return `Presenting to ${allUsers.length - 1} others`;
                }
                const nonLocalUser = allUsers.filter(
                    (user) => !user.isLocalUser
                )[0];
                return `Presenting to ${nonLocalUser.displayName}`;
            }
            case FollowModeType.activeFollowers: {
                if (localFollowers.length === 1) {
                    return `${localFollowers[0].displayName} is following you`;
                }
                return `${localFollowers.length} others are following you`;
            }
            case FollowModeType.followPresenter:
            case FollowModeType.suspendFollowPresenter: {
                return `${followingUser?.displayName} is presenting`;
            }
            case FollowModeType.followUser: {
                if (followers.length > 1) {
                    `You + ${followers.length - 1} others are following ${
                        followingUser?.displayName
                    }`;
                }
                return `You are following ${followingUser?.displayName}`;
            }
            case FollowModeType.suspendFollowUser: {
                return `Paused following ${followingUser?.displayName}`;
            }
            default:
                return "Invalid FollowModeType";
        }
    }
    if (!remoteCameraState) return null;

    return (
        <Text
            align="center"
            style={{
                color: tokens.colorNeutralForegroundOnBrand,
                marginRight: "12px",
            }}
        >
            {getTextToDisplay()}
        </Text>
    );
};
