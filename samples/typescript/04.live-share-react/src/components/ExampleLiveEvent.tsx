import { useLiveEvent } from "@microsoft/live-share-react";
import { FC, useState } from "react";

export const ExampleLiveEvent: FC = () => {
    const { latestEvent, allEvents, sendEvent } =
        useLiveEvent<string>("EVENT-ID");
    const [targetClientId, setTargetClientId] = useState("");

    return (
        <div style={{ marginTop: "12px" }}>
            {/* Render counts of notifications sent/received */}
            <div>
                <strong>Total received:</strong>
                {` ${allEvents.filter((event) => !event.local).length}`}
            </div>
            <div>
                <strong>Total sent:</strong>
                {` ${allEvents.filter((event) => event.local).length}`}
            </div>
            {/* Show latest reaction */}
            {latestEvent?.local === false && (
                <div>
                    <strong>Received:</strong>
                    {` ${latestEvent?.value}, `}
                    <strong>From:</strong>
                    {` ${latestEvent?.clientId}`}
                </div>
            )}
            {latestEvent?.local === true && (
                <div>
                    <strong>Sent:</strong>
                    {` ${latestEvent?.value}`}
                </div>
            )}
            {!latestEvent && (
                <div>
                    <strong>Latest:</strong>
                    {` N/A`}
                </div>
            )}
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
                <input
                    placeholder="Enter targetClientId..."
                    value={targetClientId}
                    onChange={(ev) => {
                        setTargetClientId(ev.target.value);
                    }}
                />
                <button
                    disabled={!targetClientId}
                    onClick={() => {
                        sendEvent("🎯", targetClientId);
                    }}
                >
                    {"🎯"}
                </button>
            </div>
        </div>
    );
};
