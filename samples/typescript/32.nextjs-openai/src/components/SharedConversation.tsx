import {
    Body1,
    Button,
    Textarea,
    TextareaOnChangeData,
} from "@fluentui/react-components";
import { Send20Regular } from "@fluentui/react-icons";
import { tokens } from "@fluentui/react-theme";
import { LivePresenceUser } from "@microsoft/live-share";
import { FC, memo, useCallback } from "react";
import { FlexColumn, FlexItem, FlexRow } from "./flex";
import { ScrollView } from "./ScrollView";
import { SentMessage } from "./SentMessage";
import { AlwaysScrollToBottom } from "./AlwaysScrollToBottom";
import { OpenAICharacterBudget } from "@/constants/TokenBudget";
import { IdeaConversation } from "@/types/IdeaConversation";
import { getInitialPromptMessageText } from "@/utils";
import { useMessages } from "@/hooks/useMessages";

interface ISharedConversationProps {
    conversationId?: string;
    conversation?: IdeaConversation;
    leftOpen: boolean;
    rightOpen: boolean;
    localUser: LivePresenceUser<{ name: string }>;
}

export const SharedConversation: FC<ISharedConversationProps> = memo(
    (props) => {
        const { conversationId, conversation, leftOpen, rightOpen, localUser } =
            props;
        const {
            message,
            messageMap,
            onSendMessage,
            setMessage,
            waitingForResponse,
        } = useMessages(conversationId, conversation, localUser);

        const isResponseSelected = !!conversationId && !!conversation;

        const onChangePrompt = useCallback(
            (ev: any, data: TextareaOnChangeData) => {
                if (data.value.length <= OpenAICharacterBudget) {
                    setMessage(data.value);
                }
            },
            [setMessage]
        );

        const humanReadablePrompt = conversation
            ? getInitialPromptMessageText(
                  conversation.initialPromptText,
                  conversation.initialIdeas,
                  false
              )
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
    }
);
SharedConversation.displayName = "SharedConversation";
