import { Text } from "@fluentui/react-components";
import { FlexColumn } from "./flex";

export const PageError = ({ error }) => {
    return (
        <FlexColumn fill vAlign="center" hAlign="center">
            <Text align="center">{`${error}`}</Text>
        </FlexColumn>
    );
};
