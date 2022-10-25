/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { mergeClasses } from "@fluentui/react-components";
import { FC, ReactNode } from "react";
import { getFlexColumnStyles, getFlexItemStyles } from "../styles/layouts";

export const ListWrapper: FC<{children: ReactNode}> = ({ children }) => {

  const flexColumnStyles = getFlexColumnStyles();
  const flexItemStyles = getFlexItemStyles();
  return (
    <div
      className={mergeClasses(
        flexColumnStyles.root,
        flexColumnStyles.fill,
        flexColumnStyles.vAlignStart,
        flexColumnStyles.scroll
      )}
    >
      <div
        className={mergeClasses(
          flexColumnStyles.root,
          flexColumnStyles.fill,
          flexColumnStyles.vAlignStart,
          flexColumnStyles.smallGap,
          flexItemStyles.grow,
        )}
      >
        { children }
      </div>
    </div>
  );
};