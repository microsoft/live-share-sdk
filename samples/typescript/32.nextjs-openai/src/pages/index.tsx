import {
    Body1Strong,
    Button,
    Spinner,
    tokens,
} from "@fluentui/react-components";
import { PanelLeft20Filled, PanelRight20Filled } from "@fluentui/react-icons";
import { useRouter } from "next/router";
import { LiveShareProvider } from "@microsoft/live-share-react";
import { NextPage } from "next";
import { useState, useRef, useEffect } from "react";
import { ILiveShareHost, TestLiveShareHost } from "@microsoft/live-share";
import {
    FlexColumn,
    FlexItem,
    FlexRow,
    SharedOpenAISummary,
} from "@/components";
import { type app } from "@microsoft/teams-js";
import { MockContext } from "@/constants/MockContext";

const Home: NextPage = () => {
    const [liveShareHost, setLiveShareHost] = useState<ILiveShareHost>();
    const [context, setContext] = useState<app.Context>();
    const [leftOpen, setLeftOpen] = useState<boolean>(true);
    const [rightOpen, setRightOpen] = useState<boolean>(true);

    const { query, isReady } = useRouter();
    const loadingRef = useRef<boolean>(false);

    useEffect(() => {
        if (!isReady) return;
        let mounted = true;
        const loader = async () => {
            if (mounted && !loadingRef.current) {
                loadingRef.current = true;
                if (query.inTeams === "true") {
                    const { LiveShareHost, app } = await import(
                        "@microsoft/teams-js"
                    );
                    await app.initialize();
                    app.notifyAppLoaded();
                    app.notifySuccess();
                    const context = await app.getContext();
                    setContext(context);
                    setLiveShareHost(LiveShareHost.create());
                } else {
                    setContext(MockContext as app.Context);
                    setLiveShareHost(TestLiveShareHost.create());
                }
            }
        };
        loader();
        return () => {
            mounted = false;
        };
    }, [query.inTeams, isReady]);

    if (!liveShareHost || !context)
        return (
            <FlexRow vAlignCenter>
                <Spinner />
            </FlexRow>
        );
    return (
        <LiveShareProvider host={liveShareHost} joinOnLoad>
            <FlexColumn
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    overflow: "hidden",
                }}
            >
                <FlexItem noShrink>
                    <FlexRow
                        spaceBetween
                        vAlignCenter
                        style={{
                            height: "44px",
                            paddingLeft: "12px",
                            paddingRight: "8px",
                            backgroundColor: tokens.colorNeutralBackground3,
                        }}
                    >
                        <Body1Strong>{"Brainstorm CoPilot"}</Body1Strong>
                        <FlexRow>
                            <Button appearance="subtle"
                                style={{
                                  color: leftOpen ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground1,
                                }}
                                icon={<PanelLeft20Filled />}
                                onClick={() => {
                                    setLeftOpen(!leftOpen);
                                }}
                            />
                            <Button appearance="subtle"
                                style={{
                                  color: rightOpen ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground1,
                                }}
                                icon={<PanelRight20Filled />}
                                onClick={() => {
                                    setRightOpen(!rightOpen);
                                }}
                            />
                        </FlexRow>
                    </FlexRow>
                </FlexItem>
                <FlexItem grow>
                    <SharedOpenAISummary
                        uniqueKey="shared-openai-summary"
                        context={context}
                        leftOpen={leftOpen}
                        rightOpen={rightOpen}
                    />
                </FlexItem>
            </FlexColumn>
        </LiveShareProvider>
    );
};

export default Home;
