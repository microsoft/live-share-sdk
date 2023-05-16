import { UserMeetingRole } from "@microsoft/live-share";
import { useLiveEvent } from "@microsoft/live-share-react";

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];

export const ExampleLiveEvent = () => {
    const { latestEvent, allEvents, sendEvent } = useLiveEvent(
        "EVENT-ID",
        ALLOWED_ROLES
    );

    return (
        <div style={{ marginTop: "12px" }}>
            {/* Render counts of notifications sent/received */}
            <div>{`Total received: ${
                allEvents.filter((event) => !event.local).length
            }`}</div>
            <div>{`Total sent: ${
                allEvents.filter((event) => event.local).length
            }`}</div>
            {/* Buttons for sending reactions */}
            <div className="flex row hAlign wrap">
                <button
                    onClick={() => {
                        sendEvent({
                            emoji: "❤️",
                        });
                    }}
                >
                    {"❤️"}
                </button>
                <button
                    onClick={() => {
                        sendEvent({
                            emoji: "😂",
                        });
                    }}
                >
                    {"😂"}
                </button>
                {/* Show latest reaction */}
                {latestEvent?.local === false && (
                    <div>{`Received: ${latestEvent?.value?.emoji}`}</div>
                )}
                {latestEvent?.local === true && (
                    <div>{`Sent: ${latestEvent?.value?.emoji}`}</div>
                )}
            </div>
        </div>
    );
};
