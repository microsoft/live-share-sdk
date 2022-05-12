/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useMemo } from "react";

import { formatTimeValue } from "../utils/formatTimeValue";
// UI imports:
import { Text, mergeClasses } from "@fluentui/react-components";
import { getFlexRowStyles } from "../styles/layout";

export const GameTimer = ({ timerState }) => {
  const formattedTimestamp = useMemo(() => {
    if (!timerState) {
      return 0;
    }
    return formatTimeValue(timerState.duration - timerState.position);
  }, [timerState]);
  const flexRowStyles = getFlexRowStyles();
  return (
    <div
      className={mergeClasses(
        flexRowStyles.root,
        flexRowStyles.smallGap,
        flexRowStyles.hAlignCenter,
        flexRowStyles.vAlignEnd
      )}
      style={{ width: "7.2rem", padding: "" }}
    >
      <Text size={400} weight="bold">
        {formattedTimestamp}
      </Text>
    </div>
  );
};
