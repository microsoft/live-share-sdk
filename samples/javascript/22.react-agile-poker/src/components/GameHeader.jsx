/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Title3, Image } from "@fluentui/react-components";
import logo from "../assets/agile-poker-logo-small.png";
import { FlexRow } from "./flex";

export const GameHeader = ({ centerText = "", timer = null }) => {
    return (
        <FlexRow
            gap="small"
            vAlign="center"
        >
            <div style={{ width: "199px" }}>
                <Image width={199} src={logo} />
            </div>
            <FlexRow
                fill="width"
                hAlign="center"
            >
                <Title3 align="center">{centerText}</Title3>
            </FlexRow>
            <div style={{ width: "199px" }}>{timer}</div>
        </FlexRow>
    );
};
