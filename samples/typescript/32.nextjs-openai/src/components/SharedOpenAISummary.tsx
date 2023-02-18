import { Body1, Button, Spinner, tokens } from "@fluentui/react-components";
import {
    ChevronLeft16Regular,
    ChevronRight16Regular,
} from "@fluentui/react-icons";
import {
    useLivePresence,
    useLiveState,
    useSharedMap,
    useSharedState,
} from "@microsoft/live-share-react";
import { FC } from "react";
import { FlexRow } from "./flex";
import { type app } from "@microsoft/teams-js";
import { v4 as uuid } from "uuid";
import { getRandomUserName } from "@/utils/getRandomUserName";
import { SharedConversation } from "./SharedConversation";
import { SharedIdeaList } from "./SharedIdeaList";
import { IdeaConversation } from "@/types/IdeaConversation";

interface ISharedOpenAISummaryProps {
    context: app.Context;
    leftOpen: boolean;
    rightOpen: boolean;
    uniqueKey: string;
}

export const SharedOpenAISummary: FC<ISharedOpenAISummaryProps> = (props) => {
    const { context, leftOpen, rightOpen, uniqueKey } = props;
    const { map: ideaConversationMap, setEntry: setIdeaConversationEntry } =
        useSharedMap<IdeaConversation>(uniqueKey);
    const [loadingState, loadingData, setLoadingState] = useLiveState<string>(
        `${props.uniqueKey}-loading`,
        undefined,
        "waiting"
    );
    const [selectedConversationIndex, setSelectedConversationIndex] =
        useSharedState<number>(
            `${props.uniqueKey}-selectedConversationIndex`,
            0
        );
    const { localUser, otherUsers } = useLivePresence(context.user!.id, {
        name: context.user!.userPrincipalName || getRandomUserName(),
    });

    const onDidGetResponse = (responseText: string) => {
        setIdeaConversationEntry(`${uniqueKey}-${uuid()}`, {
            createdAt: new Date().toISOString(),
            initialResponseText: responseText,
        });
    };

    if (!localUser) {
        return (
            <FlexRow hAlignCenter vAlignCenter>
                <Spinner />
            </FlexRow>
        );
    }

    const isLoading = loadingState === "loading";
    const sortedConversations = [...ideaConversationMap.entries()].sort(
        ([aId, aCI], [bId, bCI]) =>
            new Date(aCI.createdAt) > new Date(bCI.createdAt) ? -1 : 1
    );
    const mostRecentConversation =
        sortedConversations.length > selectedConversationIndex
            ? sortedConversations[selectedConversationIndex]
            : undefined;

    return (
        <>
            <SharedIdeaList
                ideaBoardId={uniqueKey}
                leftOpen={leftOpen}
                rightOpen={rightOpen}
                isLoading={isLoading}
                localUser={localUser}
                otherUsers={otherUsers}
                setLoadingState={setLoadingState}
                onDidGetResponse={onDidGetResponse}
            />
            <FlexRow
                vAlignCenter
                style={{
                    backgroundColor: tokens.colorNeutralBackground2,
                    position: "absolute",
                    left: leftOpen ? "50%" : 0,
                    bottom: 0,
                    top: "44px",
                    right: 0,
                    visibility: rightOpen ? "visible" : "hidden",
                    height: "32px",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                }}
            >
                <Button
                    icon={<ChevronLeft16Regular />}
                    appearance="subtle"
                    disabled={
                        selectedConversationIndex === sortedConversations.length - 1
                    }
                    onClick={() => {
                        if (selectedConversationIndex < sortedConversations.length - 1) {
                            setSelectedConversationIndex(
                                selectedConversationIndex + 1
                            );
                        }
                    }}
                />
                <Body1>
                    {`${
                        sortedConversations.length - selectedConversationIndex
                    }/${sortedConversations.length}`}
                </Body1>
                <Button
                    icon={<ChevronRight16Regular />}
                    appearance="subtle"
                    disabled={
                        selectedConversationIndex === 0
                    }
                    onClick={() => {
                        if (selectedConversationIndex > 0) {
                            setSelectedConversationIndex(
                                selectedConversationIndex - 1
                            );
                        }
                    }}
                />
            </FlexRow>
            <SharedConversation
                conversationId={mostRecentConversation?.[0]}
                responseText={
                    mostRecentConversation?.[1].initialResponseText
                }
                leftOpen={leftOpen}
                rightOpen={rightOpen}
                isLoading={isLoading}
                localUser={localUser}
            />
        </>
    );
};
