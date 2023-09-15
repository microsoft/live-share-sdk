import { FC } from "react";
import { FlexRow } from "./flex";
import { tokens } from "@fluentui/react-theme";
import { Text } from "@fluentui/react-components";

export const MoreInformationText: FC = () => {
    return (
        <FlexRow
            hAlign="center"
            style={{
                marginTop: "56px",
            }}
        >
            <Text
                align="center"
                style={{
                    maxWidth: "80%",
                    padding: "8px",
                    borderRadius: "4px",
                    backgroundColor: tokens.colorNeutralBackground5,
                }}
            >
                The timer state will be lost once the last user closes the
                application. This makes it ideal for meeting stage scenarios,
                but less useful meeting side panel ones. To make it work in the
                meeting side panel, you could copy/paste our{" "}
                <code>LiveTimer</code> class and replaces the use of{" "}
                <code>LiveObjectSynchronizer</code> with a Fluid{" "}
                <code>SharedMap</code>. This is an advanced use case, but if you
                are interested, feel free to start a discussion on our GitHub
                page.
            </Text>
        </FlexRow>
    );
};
