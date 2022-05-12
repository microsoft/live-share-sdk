/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { tokens } from "@fluentui/react-theme";
import { makeStyles } from "@fluentui/react-components";

export const getPrimaryButtonStyles = makeStyles({
  button: {
    backgroundColor: tokens.colorPaletteYellowBackground3,
    color: tokens.colorNeutralBackground2Selected,
    paddingRight: "1.2rem",
    paddingLeft: "1.2rem",
    paddingTop: "0.6rem",
    paddingBottom: "0.6rem",
    fontSize: "1.4rem",
    lineHeight: "2.5rem",
    borderTopWidth: "0.2rem",
    borderBottomWidth: "0.2rem",
    borderRightWidth: "0.2rem",
    borderLeftWidth: "0.2rem",
    borderTopColor: tokens.colorNeutralBackground2Selected,
    borderBottomColor: tokens.colorNeutralBackground2Selected,
    borderLeftColor: tokens.colorNeutralBackground2Selected,
    borderRightColor: tokens.colorNeutralBackground2Selected,
    borderTopRightRadius: "0.4rem",
    borderTopLeftRadius: "0.4rem",
    borderBottomLeftRadius: "0.4rem",
    borderBottomRightRadius: "0.4rem",
    fontWeight: "700",
    height: "auto",
    width: "auto",
    ":hover": {
      backgroundColor: tokens.colorPaletteYellowBackground2,
      color: tokens.colorNeutralBackground2Hover,
      borderTopColor: tokens.colorNeutralBackground2Hover,
      borderBottomColor: tokens.colorNeutralBackground2Hover,
      borderLeftColor: tokens.colorNeutralBackground2Hover,
      borderRightColor: tokens.colorNeutralBackground2Hover,
    },
    ":active": {
      backgroundColor: tokens.colorPaletteYellowBackground2,
      color: tokens.colorNeutralBackground2Hover,
      borderTopColor: tokens.colorNeutralBackground2Hover,
      borderBottomColor: tokens.colorNeutralBackground2Hover,
      borderLeftColor: tokens.colorNeutralBackground2Hover,
      borderRightColor: tokens.colorNeutralBackground2Hover,
    },
  },
});
