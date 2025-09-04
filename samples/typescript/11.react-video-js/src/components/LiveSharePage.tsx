import { Text } from "@fluentui/react-components";
import { Spinner } from "@fluentui/react-components";
import { app } from "@microsoft/teams-js";
import { FC, ReactNode } from "react";
import { FlexColumn } from "./flex";
import { inTeams } from "../utils/inTeams";
import { useLiveShareContext } from "@microsoft/live-share-react";
import { PageError } from "./PageError";

export const LiveSharePage: FC<{
    children: ReactNode;
    context: app.Context | undefined;
}> = ({ children, context }) => {
    const { joined, joinError } = useLiveShareContext();
    let loadText: string | undefined;
    if (!context) {
        loadText = "Loading Teams Client SDK...";
    } else if (!joined) {
        loadText = "Joining Live Share session...";
    }

    return (
        <>
            {!!joinError && <PageError error={joinError} />}
            {!joinError && !!loadText && (
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
                        backgroundColor: inTeams() ? "transparent" : "#202020",
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
            {!!context && (
                <div style={{ visibility: loadText ? "hidden" : undefined }}>
                    {children}
                </div>
            )}
        </>
    );
};
