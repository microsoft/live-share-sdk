/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { mergeClasses } from "@fluentui/react-components";
import { getFlexColumnStyles } from "../styles/layout";

/** These UI components are extracted out in order to
/* streamline sample logic discussion. */
const FlexColumn = (props) => {
  const { children, isInTeams, scroll } = props;

  const flexColumnStyles = getFlexColumnStyles();

  const flexColumn = mergeClasses(
    flexColumnStyles.root,
    flexColumnStyles.fill,
    flexColumnStyles.vAlignStart,
    scroll ? flexColumnStyles.scroll : ""
  );

  return (
    <div className={flexColumn}>
      {children}
    </div>
  );
};

const FlexSection = ({ centerAlign, children }) => {
  const flexColumnStyles = getFlexColumnStyles();

  const flexSmallGap = mergeClasses(
    flexColumnStyles.root,
    flexColumnStyles.fill,
    centerAlign ? flexColumnStyles.vAlignCenter : flexColumnStyles.vAlignStart,
    centerAlign ? flexColumnStyles.hAlignCenter : "",
    flexColumnStyles.smallGap
  );
  return <div className={flexSmallGap}>{children}</div>;
};

export { FlexColumn, FlexSection };
