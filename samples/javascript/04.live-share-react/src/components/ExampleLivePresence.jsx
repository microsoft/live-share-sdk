import { PresenceState, UserMeetingRole } from "@microsoft/live-share";
import { useLivePresence } from "@microsoft/live-share-react";

// You can use this as an easy way to filter out certain roles
const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];

export const ExampleLivePresence = () => {
    const { localUser, allUsers, updatePresence } = useLivePresence(
        "CUSTOM-PRESENCE-KEY",
        { toggleCount: 0 }, // optional
        PresenceState.online, // optional, default online
        ALLOWED_ROLES // optional, default all users can set
    );
    return (
        <div style={{ padding: "24px 12px" }}>
            <h2>{"Users:"}</h2>
            <div>
                {allUsers.map((user) => (
                    <div
                        key={user.userId}
                        style={{
                            color: user?.state === "offline" ? "red" : "green",
                        }}
                    >{`${user.displayName}, isLocalUser: ${user.isLocalUser}, ${user.userId}`}</div>
                ))}
            </div>
            <button
                onClick={() => {
                    if (!localUser) return;
                    updatePresence(
                        {
                            toggleCount: localUser.data.toggleCount + 1,
                        },
                        localUser.state === PresenceState.offline
                            ? PresenceState.online
                            : PresenceState.offline
                    );
                }}
            >
                {`Go ${
                    localUser?.state === PresenceState.offline
                        ? "Online"
                        : "Offline"
                }`}
            </button>
        </div>
    );
};
