import { PresenceState } from "@microsoft/live-share";
import { useLivePresence } from "@microsoft/live-share-react";

export const ExampleLivePresence = () => {
    const { localUser, allUsers, updatePresence } = useLivePresence();
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
                    >{`${user.displayName}, isLocalUser: ${user.isLocalUser}`}</div>
                ))}
            </div>
            <button
                onClick={() => {
                    updatePresence(
                        undefined,
                        localUser?.state === PresenceState.offline
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
