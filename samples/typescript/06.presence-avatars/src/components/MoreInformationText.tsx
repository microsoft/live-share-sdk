import { FC } from "react";
import { FlexRow } from "./flex";
import { tokens } from "@fluentui/react-theme";
import { Text } from "@fluentui/react-components";

export const MoreInformationText: FC = () => {
    return (
        <FlexRow hAlign="center">
            <Text
                align="center"
                style={{
                    maxWidth: "80%",
                    padding: "8px",
                    borderRadius: "4px",
                    backgroundColor: tokens.colorNeutralBackground5,
                }}
            >
                By default, users that disconnect will take up to 20 seconds to
                appear as offline. This can be changed by setting{" "}
                <code>expirationPeriod</code> via your <code>LivePresence</code>{" "}
                object. When testing outside of Teams, each time a new socket
                connection is opened, they will appear as a new user in the
                list.
            </Text>
        </FlexRow>
    );
};
