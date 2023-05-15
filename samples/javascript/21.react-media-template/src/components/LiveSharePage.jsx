import { Text } from "@fluentui/react-components";
import { Spinner } from "@fluentui/react-components";
import { FlexColumn } from "./flex";
import { memo } from "react";

export const LiveSharePage = memo(
    ({ children, context, container, started }) => {
        let loadText = undefined;
        if (!context) {
            loadText = "Loading Teams Client SDK...";
        }
        if (!container) {
            loadText = "Joining Live Share session...";
        }
        if (!started) {
            loadText = "Starting sync...";
        }

        return (
            <>
                {!!loadText && (
                    <FlexColumn
                        hAlign="center"
                        vAlign="center"
                        style={{
                            position: "fixed",
                            left: "0px",
                            right: "0px",
                            top: "0px",
                            bottom: "0px",
                            zIndex: 9999,
                        }}
                    >
                        <Spinner />
                        <Text
                            align="center"
                            size={300}
                            weight="medium"
                            style={{ marginTop: "0.5rem" }}
                        >
                            {loadText}
                        </Text>
                    </FlexColumn>
                )}
                <div
                    style={{
                        visibility: loadText ? "hidden" : undefined,
                    }}
                >
                    {children}
                </div>
            </>
        );
    }
);
LiveSharePage.displayName = "LiveSharePage";
