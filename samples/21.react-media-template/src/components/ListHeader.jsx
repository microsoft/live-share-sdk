/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Button, mergeClasses, Subheadline } from "@fluentui/react-components";
import { getFlexItemStyles, getFlexRowStyles } from "../styles/layouts";
import { Add24Filled } from "@fluentui/react-icons";

export const ListHeader = ({ addMediaItem }) => {
  const flexRowStyles = getFlexRowStyles();
  const flexItemStyles = getFlexItemStyles();
  return (
    <div
      style={{ width: "100%" }}
      className={mergeClasses(flexRowStyles.root, flexRowStyles.vAlignCenter, flexItemStyles.noShrink)}
    >
      <Subheadline className={flexItemStyles.grow}>Videos</Subheadline>
      <Button
        icon={<Add24Filled />}
        appearance="subtle"
        onClick={() => {
          // Test adding a video to the playlist using a hardcoded
          // videoId. This is not a production scenario.
          addMediaItem(2);
        }}
      />
    </div>
  );
};
