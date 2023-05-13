import { UserMeetingRole } from "@microsoft/live-share";
import { useLiveTimer, useSharedState } from "@microsoft/live-share-react";
import { FC } from "react";

const TICK_RATE_MILLISECONDS = 250;
const TIMER_DURATION = 60 * 1000;

export const ExampleLiveTimer: FC = () => {
    const [duration, setDuration] = useSharedState(
        "TIMER-DURATION",
        TIMER_DURATION
    );
    const { milliRemaining, timerConfig, start, pause, play } = useLiveTimer(
        "TIMER-ID",
        [UserMeetingRole.organizer, UserMeetingRole.presenter],
        TICK_RATE_MILLISECONDS
    );

    return (
        <div>
            <div className="full-width">
                <h2>{"Timer:"}</h2>
            </div>
            <div className="margin-bottom">
                <div className="flex row hAlign wrap">
                    <h3>{"Duration:"}</h3>
                    <p>{`${duration / 1000} seconds`}</p>
                    <button
                        onClick={() => {
                            setDuration(duration + 1000);
                        }}
                    >
                        {"+1"}
                    </button>
                    <button
                        onClick={() => {
                            setDuration(duration - 1000);
                        }}
                    >
                        {"-1"}
                    </button>
                </div>
            </div>
            <div className="flex row hAlign wrap">
                {/* Buttons for sending reactions */}
                {timerConfig === undefined && (
                    <button
                        onClick={() => {
                            start(duration);
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
                        start(duration);
                    }}
                >
                    {"Reset"}
                </button>
                {timerConfig?.duration && milliRemaining !== undefined && (
                    <p>{`${Math.round(milliRemaining / 1000)} / ${Math.round(
                        timerConfig.duration / 1000
                    )} seconds`}</p>
                )}
                {milliRemaining === undefined && (
                    <p>{`${Math.round(duration / 1000)} / ${Math.round(
                        duration / 1000
                    )} seconds`}</p>
                )}
            </div>
        </div>
    );
};
