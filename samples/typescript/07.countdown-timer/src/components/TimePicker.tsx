import { FC, useCallback } from "react";
import {
    SpinButton,
    SpinButtonProps,
    SpinButtonChangeEvent,
    SpinButtonOnChangeData,
    Text,
} from "@fluentui/react-components";
import { FlexRow } from "./flex";
import {
    millisecondsToTime,
    timeToMilliseconds,
    unitToDisplayValue,
} from "../utils/time-utils";

export const TimePicker: FC<{
    milliDuration: number;
    changeDuration: (newValue: number) => Promise<void>;
}> = ({ milliDuration, changeDuration }) => {
    const [hours, minutes, seconds] = millisecondsToTime(milliDuration);

    const onHoursSpinButtonChange: SpinButtonProps["onChange"] = useCallback(
        (event: SpinButtonChangeEvent, data: SpinButtonOnChangeData) => {
            if (data.value === null) return;
            console.log("onSpinButtonChange", data.value, data.displayValue);
            if (data.value !== undefined) {
                changeDuration(
                    timeToMilliseconds([data.value, minutes, seconds])
                );
            } else if (data.displayValue !== undefined) {
                const newValue = parseFloat(data.displayValue);
                if (!Number.isNaN(newValue)) {
                    changeDuration(
                        timeToMilliseconds([newValue, minutes, seconds])
                    );
                } else {
                    console.error(
                        `Cannot parse "${data.displayValue}" as a number.`
                    );
                }
            }
        },
        [hours, minutes, seconds, changeDuration]
    );
    const onMinutesSpinButtonChange: SpinButtonProps["onChange"] = useCallback(
        (event: SpinButtonChangeEvent, data: SpinButtonOnChangeData) => {
            if (data.value === null) return;
            console.log("onSpinButtonChange", data.value, data.displayValue);
            if (data.value !== undefined) {
                changeDuration(
                    timeToMilliseconds([hours, data.value, seconds])
                );
            } else if (data.displayValue !== undefined) {
                const newValue = parseFloat(data.displayValue);
                if (!Number.isNaN(newValue)) {
                    changeDuration(
                        timeToMilliseconds([hours, newValue, seconds])
                    );
                } else {
                    console.error(
                        `Cannot parse "${data.displayValue}" as a number.`
                    );
                }
            }
        },
        [hours, minutes, seconds, changeDuration]
    );
    const onSecondsSpinButtonChange: SpinButtonProps["onChange"] = useCallback(
        (event: SpinButtonChangeEvent, data: SpinButtonOnChangeData) => {
            if (data.value === null) return;
            console.log("onSpinButtonChange", data.value, data.displayValue);
            if (data.value !== undefined) {
                changeDuration(
                    timeToMilliseconds([hours, minutes, data.value])
                );
            } else if (data.displayValue !== undefined) {
                const newValue = parseFloat(data.displayValue);
                if (!Number.isNaN(newValue)) {
                    changeDuration(
                        timeToMilliseconds([hours, minutes, newValue])
                    );
                } else {
                    console.error(
                        `Cannot parse "${data.displayValue}" as a number.`
                    );
                }
            }
        },
        [hours, minutes, seconds, changeDuration]
    );

    return (
        <FlexRow
            fill="width"
            gap="small"
            hAlign="center"
            vAlign="center"
            style={{
                // Used to make height consistent with TimerDisplay
                minHeight: "256px",
            }}
        >
            <SpinButton
                appearance="underline"
                value={hours}
                displayValue={unitToDisplayValue(hours)}
                size="medium"
                min={0}
                max={99}
                onChange={onHoursSpinButtonChange}
            />
            <Text>:</Text>
            <SpinButton
                appearance="underline"
                value={minutes}
                displayValue={unitToDisplayValue(minutes)}
                size="medium"
                min={0}
                max={59}
                onChange={onMinutesSpinButtonChange}
            />
            <Text>:</Text>
            <SpinButton
                appearance="underline"
                value={seconds}
                displayValue={unitToDisplayValue(seconds)}
                size="medium"
                min={0}
                max={59}
                onChange={onSecondsSpinButtonChange}
            />
        </FlexRow>
    );
};
