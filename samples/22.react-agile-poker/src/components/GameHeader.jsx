/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Title3, Image, mergeClasses } from "@fluentui/react-components";
import { getFlexItemStyles, getFlexRowStyles } from "../styles/layout";
import logo from "../assets/agile-poker-logo-small.png";

export const GameHeader = ({ centerText = "", timer = null }) => {
  const flexRowStyles = getFlexRowStyles();
  const flexItemStyles = getFlexItemStyles();
  return (
    <div
      className={mergeClasses(
        flexRowStyles.root,
        flexRowStyles.smallGap,
        flexRowStyles.vAlignCenter
      )}
    >
      <div style={{ width: "199px" }}>
        <Image width={199} src={logo} />
      </div>
      <div
        className={mergeClasses(
          flexItemStyles.grow,
          flexRowStyles.root,
          flexRowStyles.hAlignCenter
        )}
      >
        <Title3 align="center">{centerText}</Title3>
      </div>
      <div style={{ width: "199px" }}>{timer}</div>
    </div>
  );
};
