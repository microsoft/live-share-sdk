import { Text } from "@fluentui/react-components";
import { Spinner } from "@fluentui/react-components";
import { useMemo } from "react";
import { FlexColumn } from "./flex";

export const LiveSharePage = ({ children, context, container, started }) => {
    const loadText = useMemo(() => {
        if (!context) {
            return "Loading Teams Client SDK...";
        }
        if (!container) {
            return "Joining Live Share session...";
        }
        if (!started) {
            return "Starting sync...";
        }
        return undefined;
    }, [context, container, started]);

    return (
        <>
            {loadText && (
                <FlexColumn
                    hAlignCenter
                    vAlignCenter
                    style={{
                        position: "fixed",
                        left: "0px",
                        right: "0px",
                        top: "0px",
                        bottom: "0px",
                        zIndex: 9999,
                        backgroundColor: "#201F1F",
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
            <div style={{ visibility: loadText ? "hidden" : undefined }}>
                {children}
            </div>
        </>
    );
};
