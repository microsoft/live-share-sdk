/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Title2, mergeClasses } from "@fluentui/react-components";
import { getFlexColumnStyles } from "../styles/layout";

export const ErrorPane = ({ error }) => {
  const flexColumnStyles = getFlexColumnStyles();
  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.smallGap,
        flexColumnStyles.hAlignCenter,
        flexColumnStyles.vAlignCenter
      )}
      style={{ padding: "5rem" }}
    >
      <Title2>{`${error}`}</Title2>
    </div>
  );
};
