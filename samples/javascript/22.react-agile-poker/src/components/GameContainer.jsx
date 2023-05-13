/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import background from "../assets/game-bg.png";
import { FlexColumn } from "./flex";

export const GameContainer = ({ children }) => {
    return (
        <FlexColumn
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
        </FlexColumn>
    );
};
