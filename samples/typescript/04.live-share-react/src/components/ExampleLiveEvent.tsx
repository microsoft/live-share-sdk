import { useLiveEvent } from "@microsoft/live-share-react";
import { FC } from "react";

export const ExampleLiveEvent: FC = () => {
    const { latestEvent, allEvents, sendEvent } =
        useLiveEvent<string>("EVENT-ID");

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
                        sendEvent("❤️");
                    }}
                >
                    {"❤️"}
                </button>
                <button
                    onClick={() => {
                        sendEvent("😂");
                    }}
                >
                    {"😂"}
                </button>
                {/* Show latest reaction */}
                {latestEvent?.local === false && (
                    <div>{`Received: ${latestEvent?.value}`}</div>
                )}
                {latestEvent?.local === true && (
                    <div>{`Sent: ${latestEvent?.value}`}</div>
                )}
            </div>
        </div>
    );
};
