import { ConversationMessage } from "@/types/ConversationMessage";
import {
    Body1,
    Button,
    Spinner,
    Textarea,
    TextareaProps,
} from "@fluentui/react-components";
import { Send20Regular } from "@fluentui/react-icons";
import { tokens } from "@fluentui/react-theme";
import { LivePresenceUser } from "@microsoft/live-share";
import { useSharedMap, useSharedState } from "@microsoft/live-share-react";
import { v4 as uuid } from "uuid";
import { FC } from "react";
import { FlexColumn, FlexItem, FlexRow } from "./flex";
import { ScrollView } from "./ScrollView";
import { SentMessage } from "./SentMessage";
import { ConversationPrompt } from "@/constants/ConversationPrompt";
import { OpenAICharacterBudget } from "@/constants/TokenBudget";
import { getShortenedOpenAIMessage } from "@/utils/getShortenedOpenAIMessage";
import { AlwaysScrollToBottom } from "./AlwaysScrollToBottom";

interface ISharedConversationProps {
    conversationId?: string;
    responseText?: string;
    leftOpen: boolean;
    rightOpen: boolean;
    isLoading: boolean;
    localUser: LivePresenceUser<{ name: string }>;
}

export const SharedConversation: FC<ISharedConversationProps> = (props) => {
    const {
        conversationId,
        responseText,
        leftOpen,
        rightOpen,
        isLoading,
        localUser,
    } = props;
    const [message, setMessage] = useSharedState<string>(
        `${props.conversationId}-message-body`,
        ""
    );
    const [waitingForResponse, setLoading] = useSharedState<boolean>(
        `${props.conversationId}-loading`,
        false
    );
    const { map: messageMap, setEntry: setMessageMapEntry } =
        useSharedMap<ConversationMessage>(`${props.conversationId}-messages`);

    const isResponseSelected = !!conversationId && !!responseText;

    const onChangePrompt: TextareaProps["onChange"] = (ev, data) => {
        const characterCap = 3000 * 4;
        if (data.value.length <= characterCap) {
            setMessage(data.value);
        }
    };

    const onSendMessage = async () => {
        if (waitingForResponse || !localUser.data) return;
        if (typeof message !== "string") {
            return;
        }
        setLoading(true);
        const newMessage: ConversationMessage = {
            isGPT: false,
            senderName: localUser.data.name,
            message,
            sentAt: new Date().toISOString(),
        };
        setMessageMapEntry(uuid(), newMessage);
        const prefix = `${ConversationPrompt}\n\n`;
        const messageHistoryText =
            `AI: ${responseText}\n` +
            [...messageMap.values()]
                .map(
                    (message) =>
                        `${message.isGPT ? "AI" : "HUMAN"}: ${message.message}`
                )
                .join("\n") +
            `\nHUMAN: ${message}\n`;
        const shortenedHistoryText = getShortenedOpenAIMessage(
            prefix,
            messageHistoryText
        );
        console.log(shortenedHistoryText);
        setMessage("");
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
                message: responseText.split("AI: ").join("").split("AI:\n").join(""),
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
        setLoading(false);
    };

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
                        {!isLoading && !isResponseSelected && (
                            <Body1 style={{ whiteSpace: "pre-wrap" }}>
                                {"Waiting for response..."}
                            </Body1>
                        )}
                        {isLoading && (
                            <FlexRow vAlignCenter hAlignCenter fill>
                                <Spinner />
                            </FlexRow>
                        )}
                        {!isLoading && isResponseSelected && (
                            <>
                                <SentMessage
                                    isGPT
                                    message={responseText}
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
                                <AlwaysScrollToBottom messagesLength={messageMap.size}/>
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
                            disabled={waitingForResponse}
                            value={message}
                            placeholder="Enter a message..."
                            onChange={onChangePrompt}
                        />
                    </FlexColumn>
                </FlexItem>
                <Button
                    appearance="subtle"
                    icon={<Send20Regular />}
                    disabled={waitingForResponse || message.length === 0}
                    onClick={onSendMessage}
                />
            </FlexRow>
        </>
    );
};
