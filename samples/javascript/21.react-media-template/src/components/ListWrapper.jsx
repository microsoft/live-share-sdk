/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FlexColumn } from "./flex";

export const ListWrapper = ({ children }) => {
    return (
        <FlexColumn
            fill
            vAlign="start"
            scroll
        >
            <FlexColumn
                fill
                vAlignStart
                grow
            >
                {children}
            </FlexColumn>
        </FlexColumn>
    );
};
