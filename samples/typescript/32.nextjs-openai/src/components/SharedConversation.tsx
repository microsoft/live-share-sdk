import { ConversationMessage } from "@/types/ConversationMessage";
import {
    Body1,
    Button,
    Textarea,
    TextareaOnChangeData,
} from "@fluentui/react-components";
import { Send20Regular } from "@fluentui/react-icons";
import { tokens } from "@fluentui/react-theme";
import { LivePresenceUser } from "@microsoft/live-share";
import { useSharedMap, useSharedState } from "@microsoft/live-share-react";
import { v4 as uuid } from "uuid";
import { FC, useCallback } from "react";
import { FlexColumn, FlexItem, FlexRow } from "./flex";
import { ScrollView } from "./ScrollView";
import { SentMessage } from "./SentMessage";
import { ConversationPrompt } from "@/constants/ConversationPrompt";
import { getShortenedOpenAIMessage } from "@/utils/getShortenedOpenAIMessage";
import { AlwaysScrollToBottom } from "./AlwaysScrollToBottom";
import { OpenAICharacterBudget } from "@/constants/TokenBudget";
import { IdeaConversation } from "@/types/IdeaConversation";

interface ISharedConversationProps {
    conversationId?: string;
    conversation?: IdeaConversation;
    leftOpen: boolean;
    rightOpen: boolean;
    localUser: LivePresenceUser<{ name: string }>;
}

export const SharedConversation: FC<ISharedConversationProps> = (props) => {
    const { conversationId, conversation, leftOpen, rightOpen, localUser } =
        props;
    const [message, setMessage] = useSharedState<string>(
        `${props.conversationId}-message-body`,
        ""
    );
    const [waitingForResponse, setWaitingForResponse] = useSharedState<boolean>(
        `${props.conversationId}-loading`,
        false
    );
    const { map: messageMap, setEntry: setMessageMapEntry } =
        useSharedMap<ConversationMessage>(`${props.conversationId}-messages`);

    const isResponseSelected = !!conversationId && !!conversation;

    const onChangePrompt = useCallback(
        (ev: any, data: TextareaOnChangeData) => {
            if (data.value.length <= OpenAICharacterBudget) {
                setMessage(data.value);
            }
        },
        [setMessage]
    );

    const onSendMessage = useCallback(async () => {
        if (
            waitingForResponse ||
            !localUser.data ||
            !conversation ||
            !conversation.initialResponseText
        )
            return;
        if (typeof message !== "string") {
            return;
        }
        setWaitingForResponse(true);
        const newMessage: ConversationMessage = {
            isGPT: false,
            senderName: localUser.data.name,
            message,
            sentAt: new Date().toISOString(),
        };
        setMessageMapEntry(uuid(), newMessage);
        setMessage("");
        const prefix = `${ConversationPrompt}\n\n`;
        const initialPromptMessageText =
            `[PREMISE START]:\n${conversation.initialPromptText}\n[PREMISE END]` +
            conversation.initialIdeas
                .map((idea, index) => {
                    // let tagText = ideaTagsMapRef.current.get(id)?.join(", ") || "";
                    let tagText = "";
                    if (idea.tags) {
                        tagText = `<${idea.tags.join(", ")}> `;
                    }
                    return `${index + 1}. {{${idea.votes}}} HUMAN: ${tagText}${
                        idea.text
                    }`;
                })
                .join("\n") +
            "\n[LIST END]\n";
        const messageHistoryText =
            `HUMAN:\n${initialPromptMessageText}\n` +
            `AI: ${conversation.initialPromptText}\n` +
            [...messageMap.values()]
                .map(
                    (conversationMessage) =>
                        `${conversationMessage.isGPT ? "AI" : "HUMAN"}: ${
                            conversationMessage.message
                        }`
                )
                .join("\n") +
            `\nHUMAN: ${newMessage.message}\n`;
        const shortenedHistoryText = getShortenedOpenAIMessage(
            prefix,
            messageHistoryText
        );
        const response = await fetch("/api/openai/summary", {
            method: "POST",
            body: JSON.stringify({
                prompt: shortenedHistoryText,
            }),
            headers: new Headers({
                "Content-Type": "application/json",
                Accept: "application/json",
            }),
        });
        let responseMessage: ConversationMessage;
        try {
            const { responseText, error } = await response.json();
            if (error && typeof error === "string") {
                throw new Error(error);
            }
            if (typeof responseText !== "string") {
                throw new Error("Invalid response");
            }
            responseMessage = {
                isGPT: true,
                senderName: "ChatGPT",
                message: responseText
                    .split("AI: ")
                    .join("")
                    .split("AI:\n")
                    .join(""),
                sentAt: new Date().toISOString(),
            };
        } catch (e: any) {
            responseMessage = {
                isGPT: true,
                senderName: "ChatGPT",
                message:
                    typeof e.message === "string"
                        ? e.message
                        : "Error generating summary",
                sentAt: new Date().toISOString(),
            };
        }
        setMessageMapEntry(uuid(), responseMessage);
        setWaitingForResponse(false);
    }, [
        message,
        messageMap,
        conversation,
        localUser,
        waitingForResponse,
        setMessage,
        setWaitingForResponse,
        setMessageMapEntry,
    ]);

    const humanReadablePrompt = conversation
        ? `${conversation.initialPromptText}\n` +
          conversation.initialIdeas
              .map((idea, index) => {
                  const tagsText =
                      idea.tags.length > 0 ? ` #${idea.tags.join(" ")}` : "";
                  const votesText = idea.votes > 0 ? ` ❤️${idea.votes}` : "";
                  return `  ${index + 1}. ${idea.text}${tagsText}${votesText}`;
              })
              .join("\n")
        : undefined;

    return (
        <>
            <ScrollView
                style={{
                    backgroundColor: tokens.colorNeutralBackground2,
                    position: "absolute",
                    left: leftOpen ? "50%" : 0,
                    bottom: "72px",
                    top: "76px",
                    right: 0,
                    visibility: rightOpen ? "visible" : "hidden",
                }}
            >
                <FlexColumn
                    marginSpacer
                    style={{
                        paddingLeft: "24px",
                        paddingRight: "24px",
                        paddingTop: "12px",
                        paddingBottom: "12px",
                        height: "100%",
                    }}
                >
                    <>
                        {!isResponseSelected && (
                            <Body1 style={{ whiteSpace: "pre-wrap" }}>
                                {"Waiting for response..."}
                            </Body1>
                        )}
                        {humanReadablePrompt && (
                            <>
                                <SentMessage
                                    isGPT={false}
                                    message={humanReadablePrompt}
                                    senderName={"Initial Prompt"}
                                />
                            </>
                        )}
                        {isResponseSelected && (
                            <>
                                <SentMessage
                                    isGPT
                                    message={
                                        conversation.initialResponseText ??
                                        "..."
                                    }
                                    senderName={"ChatGPT"}
                                />
                                {[...messageMap.entries()].map(
                                    ([id, message]) => (
                                        <SentMessage
                                            key={id}
                                            isGPT={message.isGPT}
                                            message={message.message}
                                            senderName={message.senderName}
                                        />
                                    )
                                )}
                                {waitingForResponse && (
                                    <SentMessage
                                        isGPT
                                        message={"..."}
                                        senderName={"ChatGPT"}
                                    />
                                )}
                                <AlwaysScrollToBottom
                                    messagesLength={messageMap.size}
                                />
                            </>
                        )}
                    </>
                </FlexColumn>
            </ScrollView>
            <FlexRow
                vAlignCenter
                marginSpacer
                style={{
                    backgroundColor: tokens.colorNeutralBackground2,
                    position: "absolute",
                    left: leftOpen ? "50%" : 0,
                    bottom: 0,
                    right: 0,
                    visibility: rightOpen ? "visible" : "hidden",
                    padding: "8px",
                }}
            >
                <FlexItem grow>
                    <FlexColumn>
                        <Textarea
                            disabled={
                                waitingForResponse ||
                                !isResponseSelected ||
                                !conversation?.initialResponseText
                            }
                            value={message}
                            placeholder="Enter a message..."
                            onChange={onChangePrompt}
                        />
                    </FlexColumn>
                </FlexItem>
                <Button
                    appearance="subtle"
                    icon={<Send20Regular />}
                    disabled={
                        waitingForResponse ||
                        message.length === 0 ||
                        !isResponseSelected
                    }
                    onClick={onSendMessage}
                />
            </FlexRow>
        </>
    );
};
