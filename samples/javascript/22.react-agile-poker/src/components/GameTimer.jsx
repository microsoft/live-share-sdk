/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { formatTimeValue } from "../utils/formatTimeValue";
import { Text } from "@fluentui/react-components";
import { FlexRow } from "./flex";

export const GameTimer = ({ timerMilliRemaining }) => {
    const formattedTimestamp = !timerMilliRemaining
        ? 0
        : formatTimeValue(timerMilliRemaining);
    return (
        <FlexRow
            gap="small"
            hAlign="center"
            vAlign="center"
            style={{ width: "7.2rem", padding: "" }}
        >
            <Text size={400} weight="bold">
                {formattedTimestamp}
            </Text>
        </FlexRow>
    );
};
