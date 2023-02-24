import { Subtitle2, Title3 } from "@fluentui/react-components";
import { useRouter } from "next/router";
import { NextPage } from "next";
import { useRef, useEffect } from "react";
import { FlexColumn, FlexRow } from "@/components";

const Settings: NextPage = () => {
    const { query, isReady } = useRouter();
    const loadingRef = useRef<boolean>(false);

    useEffect(() => {
        if (!isReady) return;
        let mounted = true;
        const loader = async () => {
            if (mounted && !loadingRef.current) {
                loadingRef.current = true;
                if (query.inTeams === "true") {
                    // Need to dynamically import the Teams SDK due to issues with it in Next.js
                    const { app, pages } = await import("@microsoft/teams-js");
                    await app.initialize();
                    app.notifyAppLoaded();
                    app.notifySuccess();
                    pages.config.registerOnSaveHandler(function (saveEvent) {
                        pages.config.setConfig({
                            suggestedDisplayName: "CoPilot",
                            contentUrl: `${window.location.origin}/?inTeams=true`,
                        });
                        saveEvent.notifySuccess();
                    });

                    pages.config.setValidityState(true);
                }
            }
        };
        loader();
        return () => {
            mounted = false;
        };
    }, [query.inTeams, isReady]);

    return (
        <FlexColumn vAlignCenter hAlignCenter marginSpacer>
            <FlexRow vAlignCenter>
                <Title3>{"Welcome to Brainstorm CoPilot"}</Title3>
            </FlexRow>
            <FlexRow vAlignCenter marginSpacer>
                <Subtitle2>{"Press save to continue"}</Subtitle2>
            </FlexRow>
        </FlexColumn>
    );
};

export default Settings;
