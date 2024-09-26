/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FC, ReactNode } from "react";
import { FlexColumn, FlexItem } from "./flex";

export const ListWrapper: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <FlexColumn fill="both" vAlign="start" scroll>
            <FlexItem noShrink>
                <FlexColumn vAlign="start" gap="small">
                    {children}
                </FlexColumn>
            </FlexItem>
        </FlexColumn>
    );
};
