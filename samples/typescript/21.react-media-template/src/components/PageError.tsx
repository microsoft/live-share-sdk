import { Text } from "@fluentui/react-components";
import { FC } from "react";
import { FlexColumn } from "./flex";

export const PageError: FC<{ error: any }> = ({ error }) => {
    return (
        <FlexColumn
            fill="both"
            vAlign="center"
            hAlign="center"
        >
            <Text align="center">{`${error}`}</Text>
        </FlexColumn>
    );
};
