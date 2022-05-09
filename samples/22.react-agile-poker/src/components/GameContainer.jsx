/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { mergeClasses } from "@fluentui/react-components";
import { getFlexColumnStyles } from "../styles/layout";
import background from "../assets/game-bg.png";

export const GameContainer = ({ children }) => {
  const flexColumnStyles = getFlexColumnStyles();
  return (
    <div
      className={mergeClasses(flexColumnStyles.root)}
      style={{
        padding: "2.8rem",
        backgroundImage: `url(${background})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        position: "absolute",
        left: "0",
        right: "0",
        top: "0",
        bottom: "0",
      }}
    >
      {children}
    </div>
  );
};
