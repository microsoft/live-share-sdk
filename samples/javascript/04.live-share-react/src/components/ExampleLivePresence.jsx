import { useLivePresence } from "@microsoft/live-share-react";

export const ExampleLivePresence = () => {
    const { localUser, allUsers, updatePresence, livePresence } =
        useLivePresence("CUSTOM-PRESENCE-KEY", { count: 0 });

    if (!livePresence) return <>Loading presence...</>;

    return (
        <div style={{ padding: "24px 12px" }}>
            <h2>{"Users:"}</h2>
            <div>
                {allUsers.map((user) => (
                    <div
                        key={user.userId}
                        style={{
                            color: user?.status === "offline" ? "red" : "green",
                        }}
                    >{`${user.displayName}, isLocalUser: ${user.isLocalUser}, count: ${user.data?.count}`}</div>
                ))}
            </div>
            <button
                onClick={() => {
                    updatePresence({
                        count: (localUser?.data.count ?? 0) + 1,
                    });
                }}
            >
                {`Iterate count`}
            </button>
        </div>
    );
};
