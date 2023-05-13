/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Subtitle2 } from "@fluentui/react-components";
import { FlexColumn } from "./flex";

export const StoryPointCard = ({ value, selectedValue }) => {
    return (
        <FlexColumn
            vAlign="center"
            hAlign="center"
            style={{
                width: "5.5rem",
                height: "7rem",
                backgroundColor: selectedValue === value ? "#8322FE" : "white",
                color: "black",
                borderRadius: "0.25rem",
                marginBottom: "0.8rem",
                cursor: "pointer",
            }}
        >
            <Subtitle2>{value}</Subtitle2>
        </FlexColumn>
    );
};
