import { useLiveEvent } from "@microsoft/live-share-react";
import { FC } from "react";

interface ILiveEventData {
    emoji: string;
}

export const ExampleLiveEvent: FC = () => {
    const { latestEvent, allEvents, sendEvent } = useLiveEvent<ILiveEventData>("EVENT-ID");

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
                    <div>{`Received: ${latestEvent?.event.emoji}`}</div>
                )}
                {latestEvent?.local === true && (
                    <div>{`Sent: ${latestEvent?.event.emoji}`}</div>
                )}
            </div>
        </div>
    );
};
