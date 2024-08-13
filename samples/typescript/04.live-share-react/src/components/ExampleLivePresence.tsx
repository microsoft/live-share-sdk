import { PresenceState } from "@microsoft/live-share";
import { useLivePresence } from "@microsoft/live-share-react";
import { FC } from "react";

export const ExampleLivePresence: FC = () => {
    const {
        localUser,
        allUsers,
        updatePresence,
        livePresence: v1,
    } = useLivePresence(
        "CUSTOM-PRESENCE-KEY",
        { toggleCount: 0 } // optional
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
                    >{`${user.displayName}, isLocalUser: ${user.isLocalUser}, toggleCount: ${user.data?.toggleCount}`}</div>
                ))}
            </div>
            <button
                onClick={() => {
                    updatePresence({
                        toggleCount: (localUser?.data?.toggleCount ?? 0) + 1,
                    });
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
