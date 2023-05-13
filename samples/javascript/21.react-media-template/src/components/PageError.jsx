import { Text } from "@fluentui/react-components";
import { FlexColumn } from "./flex";

export const PageError = ({ error }) => {
    return (
        <FlexColumn
            fill
            vAlignCenter
            hAlignCenter
        >
            <Text align="center">{`${error}`}</Text>
        </FlexColumn>
    );
};
