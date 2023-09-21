import { useLiveFollowMode } from "@microsoft/live-share-react";
import { FC } from "react";
import { ALLOWED_ROLES, ICustomFollowData } from "../pages";
import { Text, tokens } from "@fluentui/react-components";
import { FollowModeType } from "@microsoft/live-share";

export const FollowModeInfoText: FC = () => {
    /**
     * Following state to track which camera position to display
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
    return (
        <Text
            align="center"
            style={{
                color: tokens.colorNeutralForegroundOnBrand,
                marginRight: "12px",
            }}
        >
            {remoteCameraState?.type === FollowModeType.activePresenter &&
                `Presenting to ${allUsers.length - 1} others`}
            {remoteCameraState?.type === FollowModeType.activeFollowers &&
                localFollowers.length === 1 &&
                `${localFollowers[0].displayName} is following you`}
            {remoteCameraState?.type === FollowModeType.activeFollowers &&
                localFollowers.length > 1 &&
                `${localFollowers.length} others are following you`}
            {remoteCameraState?.type === FollowModeType.followPresenter &&
                `${followingUser?.displayName} is presenting`}
            {remoteCameraState?.type === FollowModeType.followUser &&
                followers.length <= 1 &&
                `You are following ${followingUser?.displayName}`}
            {remoteCameraState?.type === FollowModeType.followUser &&
                followers.length > 1 &&
                `You + ${followers.length - 1} others are following ${
                    followingUser?.displayName
                }`}
            {remoteCameraState?.type ===
                FollowModeType.suspendFollowPresenter &&
                `${followingUser?.displayName} is presenting`}
            {remoteCameraState?.type === FollowModeType.suspendFollowUser &&
                `Paused following ${followingUser?.displayName}`}
        </Text>
    );
};
