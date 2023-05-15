/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Title2 } from "@fluentui/react-components";
import { FlexColumn } from "./flex";

export const ErrorPane = ({ error }) => {
    return (
        <FlexColumn
            gap="small"
            hAlign="center"
            vAlign="center"
            style={{ padding: "5rem" }}
        >
            <Title2>{`${error}`}</Title2>
        </FlexColumn>
    );
};
