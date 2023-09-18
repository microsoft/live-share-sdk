import { TestLiveShareHost, UserMeetingRole } from "@microsoft/live-share";
import {
    LiveShareProvider,
    useLiveState,
    useLiveTimer,
} from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { FC, useCallback, useState } from "react";
import { Button } from "@fluentui/react-components";
import {
    FlexColumn,
    FlexRow,
    MoreInformationText,
    TimePicker,
    TimerDisplay,
} from "../components";
import {
    Play24Filled,
    Pause24Filled,
    ArrowReset24Filled,
    Edit24Filled,
} from "@fluentui/react-icons";

const IN_TEAMS = inTeams();

export const TabContent: FC = () => {
    const [host] = useState(
        IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create()
    );
    return (
        <LiveShareProvider joinOnLoad host={host}>
            <CountdownTimer />
        </LiveShareProvider>
    );
};

// Key to uniquely identify `LiveState` DDS used to track timer duration
const TIMER_DURATION_KEY = "TIMER-DURATION";
// Key to uniquely identify `LiveTimer` DDS used to track the countdown timer
const COUNTDOWN_TIMER_KEY = "TIMER-COUNTDOWN";

const TICK_RATE_MILLISECONDS = 100;
const DEFAULT_TIMER_DURATION = 60 * 1000;

const ALLOWED_ROLES = [UserMeetingRole.organizer, UserMeetingRole.presenter];

const CountdownTimer: FC = () => {
    const [editActive, setEditActive] = useState<boolean>(false);
    const [milliDuration, setMilliDuration] = useLiveState<number>(
        TIMER_DURATION_KEY,
        DEFAULT_TIMER_DURATION,
        undefined
    );
    const onFinish = useCallback(() => {
        // If you wanted to play a sound or alert the user when the timer expires, you could do so here.
    }, []);
    const { milliRemaining, timerConfig, start, pause, play } = useLiveTimer(
        COUNTDOWN_TIMER_KEY,
        undefined,
        TICK_RATE_MILLISECONDS,
        undefined, // optional on tick callback
        undefined, // optional on pause callback
        undefined, // optional on play callback
        onFinish // optional on finish callback
    );

    // We only show time picker when no timer config is available or the user chose to edit the duration for an existing one
    const shouldShowTimePicker = !timerConfig || editActive;

    return (
        <FlexColumn fill="both" vAlign="center" hAlign="center" gap="medium">
            {/* Time picker */}
            {shouldShowTimePicker && (
                <>
                    <TimePicker
                        milliDuration={milliDuration}
                        changeDuration={setMilliDuration}
                    />
                    <FlexRow gap="small" hAlign="center" fill="width">
                        {/* Cancel edit duration button */}
                        <Button
                            shape="circular"
                            disabled={!editActive}
                            onClick={() => {
                                setEditActive(false);
                            }}
                        >
                            {"Cancel"}
                        </Button>
                        {/* Start timer button */}
                        <Button
                            appearance="primary"
                            shape="circular"
                            onClick={() => {
                                start(milliDuration);
                                if (editActive) {
                                    setEditActive(false);
                                }
                            }}
                        >
                            {"Start"}
                        </Button>
                    </FlexRow>
                </>
            )}
            {!shouldShowTimePicker && (
                <>
                    <TimerDisplay
                        milliRemaining={milliRemaining}
                        milliDuration={timerConfig?.duration ?? 1}
                    />
                    <FlexRow gap="small" fill="width" hAlign="center">
                        <Button
                            shape="circular"
                            icon={<Edit24Filled />}
                            title={"Edit"}
                            onClick={() => {
                                setEditActive(true);
                            }}
                        />
                        {/* Reset timer button */}
                        <Button
                            icon={<ArrowReset24Filled />}
                            shape="circular"
                            title="Reset"
                            onClick={async () => {
                                const startWhileRunning = timerConfig.running;
                                await start(milliDuration);
                                if (startWhileRunning) return;
                                // The timer was paused when the user clicked 'reset', so we pause it
                                await pause();
                            }}
                        />
                        {/* Play/pause button */}
                        <Button
                            appearance="primary"
                            shape="circular"
                            title={timerConfig.running ? "Pause" : "Resume"}
                            icon={
                                timerConfig.running ? (
                                    <Pause24Filled />
                                ) : (
                                    <Play24Filled />
                                )
                            }
                            onClick={() => {
                                if (timerConfig.running) {
                                    pause();
                                } else {
                                    // If the timer already is ended, then we restart it
                                    if (milliRemaining === 0) {
                                        start(milliDuration);
                                        return;
                                    }
                                    play();
                                }
                            }}
                        />
                    </FlexRow>
                </>
            )}
            <MoreInformationText />
        </FlexColumn>
    );
};
