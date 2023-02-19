import { Body1, Button, Spinner, tokens } from "@fluentui/react-components";
import {
    ChevronLeft16Regular,
    ChevronRight16Regular,
} from "@fluentui/react-icons";
import {
    useLivePresence,
    useSharedMap,
    useSharedState,
} from "@microsoft/live-share-react";
import { FC } from "react";
import { FlexRow } from "./flex";
import { type app } from "@microsoft/teams-js";
import { getRandomUserName } from "@/utils/getRandomUserName";
import { SharedConversation } from "./SharedConversation";
import { SharedIdeaList } from "./SharedIdeaList";
import {
    IdeaConversation,
    IdeaConversationInitialIdea,
} from "@/types/IdeaConversation";

interface ISharedOpenAISummaryProps {
    context: app.Context;
    leftOpen: boolean;
    rightOpen: boolean;
    uniqueKey: string;
}

export const SharedOpenAISummary: FC<ISharedOpenAISummaryProps> = (props) => {
    const { context, leftOpen, rightOpen, uniqueKey } = props;
    const {
        map: ideaConversationMap,
        setEntry: setIdeaConversationEntry,
        sharedMap: ideaConversationSharedMap,
    } = useSharedMap<IdeaConversation>(uniqueKey);
    const [selectedConversationIndex, setSelectedConversationIndex] =
        useSharedState<number>(
            `${props.uniqueKey}-selectedConversationIndex`,
            0
        );
    const { localUser, otherUsers } = useLivePresence(context.user!.id, {
        name: context.user!.userPrincipalName || getRandomUserName(),
    });

    const onDidStartNewConversation = (
        conversationId: string,
        initialPromptText: string,
        initialIdeas: IdeaConversationInitialIdea[]
    ) => {
        setIdeaConversationEntry(`${uniqueKey}-${conversationId}`, {
            createdAt: new Date().toISOString(),
            initialPromptText,
            initialIdeas,
        });
    };

    const onDidGetResponse = (
        conversationId: string,
        initialResponseText: string
    ) => {
        const existingEntry = ideaConversationSharedMap?.get(
            `${uniqueKey}-${conversationId}`
        );
        if (existingEntry) {
            existingEntry.initialResponseText = initialResponseText;
            setIdeaConversationEntry(`${uniqueKey}-${conversationId}`, {
                ...existingEntry,
                initialResponseText,
            });
        } else {
            console.error(
                new Error(
                    "SharedOpenAISummary.onDidGetResponse: Could not find existing entry"
                )
            );
        }
    };

    if (!localUser) {
        return (
            <FlexRow hAlignCenter vAlignCenter>
                <Spinner />
            </FlexRow>
        );
    }

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
                localUser={localUser}
                otherUsers={otherUsers}
                onDidGetResponse={onDidGetResponse}
                onDidStartNewConversation={onDidStartNewConversation}
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
                        selectedConversationIndex ===
                        sortedConversations.length - 1
                    }
                    onClick={() => {
                        if (
                            selectedConversationIndex <
                            sortedConversations.length - 1
                        ) {
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
                    disabled={selectedConversationIndex === 0}
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
                conversation={mostRecentConversation?.[1]}
                leftOpen={leftOpen}
                rightOpen={rightOpen}
                localUser={localUser}
            />
        </>
    );
};
