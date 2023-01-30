import { UserMeetingRole } from "@microsoft/live-share";
import { useLiveTimer } from "@microsoft/live-share-react";

const TICK_RATE_MILLISECONDS = 250;
const TIMER_DURATION = 60 * 1000;

export function ExampleLiveTimer() {
    const { milliRemaining, timerConfig, start, pause, play } = useLiveTimer(
        "TIMER-ID",
        [UserMeetingRole.organizer, UserMeetingRole.presenter],
        TICK_RATE_MILLISECONDS
    );

    return (
        <div className="flex row hAlign wrap">
            <h2>{"Timer:"}</h2>
            {/* Buttons for sending reactions */}
            {timerConfig === undefined && (
                <button
                    onClick={() => {
                        start(TIMER_DURATION);
                    }}
                >
                    {"Start"}
                </button>
            )}
            {timerConfig !== undefined && (
                <button
                    onClick={() => {
                        if (timerConfig.running) {
                            pause();
                        } else {
                            play();
                        }
                    }}
                >
                    {timerConfig.running ? "Pause" : "Play"}
                </button>
            )}
            <button
                disabled={milliRemaining === undefined}
                onClick={() => {
                    start(TIMER_DURATION);
                }}
            >
                {"Reset"}
            </button>
            {milliRemaining !== undefined && (
                <p>{`${Math.round(milliRemaining / 1000)} / ${Math.round(
                    timerConfig.duration / 1000
                )} seconds`}</p>
            )}
            {milliRemaining === undefined && <p>{`${60} / ${60} seconds`}</p>}
        </div>
    );
}
