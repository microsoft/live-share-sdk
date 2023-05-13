/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FlexColumn } from "./flex";

export const ListWrapper = ({ children }) => {
    return (
        <FlexColumn
            fill
            vAlignStart
            scroll
        >
            <FlexColumn
                fill
                vAlignStart
                smallGap
                grow
            >
                {children}
            </FlexColumn>
        </FlexColumn>
    );
};
