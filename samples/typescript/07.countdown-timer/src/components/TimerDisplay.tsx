import { FC } from "react";
import { Text } from "@fluentui/react-components";
import { FlexRow } from "./flex";
import { millisecondsToTime, unitToDisplayValue } from "../utils/time-utils";
import { CircularProgress } from "./CircularProgress";

export const TimerDisplay: FC<{
    milliRemaining: number | undefined;
    milliDuration: number;
}> = ({ milliRemaining, milliDuration }) => {
    const [hours, minutes, seconds] = millisecondsToTime(milliRemaining ?? 0);
    const [dHours] = millisecondsToTime(milliDuration);

    return (
        <CircularProgress
            duration={milliDuration}
            remaining={milliRemaining ?? 0}
        >
            <FlexRow fill="width" gap="smaller" hAlign="center" vAlign="center">
                {dHours > 0 && (
                    <>
                        <Text size={900} weight="semibold">
                            {unitToDisplayValue(hours)}
                        </Text>
                        <Text>:</Text>
                    </>
                )}
                <Text size={900} weight="semibold">
                    {unitToDisplayValue(minutes)}
                </Text>
                <Text>:</Text>
                <Text size={900} weight="semibold">
                    {unitToDisplayValue(seconds)}
                </Text>
            </FlexRow>
        </CircularProgress>
    );
};
