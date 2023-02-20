import {
    ConversationMessage,
    IdeaConversation,
    OpenAICompletionOptions,
    OpenAIModelType,
} from "@/types";
import { LivePresenceUser, UserMeetingRole } from "@microsoft/live-share";
import {
    useLiveAICompletion,
    useLiveState,
    useSharedMap,
    useSharedState,
} from "@microsoft/live-share-react";
import { useCallback } from "react";
import { useGetCompletion } from "./useGetCompletion";
import { v4 as uuid } from "uuid";
import {
    getMessageHistoryText,
    getShortenedOpenAIMessage,
} from "@/utils";
import { ConversationPrompt } from "@/constants/ConversationPrompt";

const ALLOWED_MEETING_ROLES = [
    UserMeetingRole.organizer,
    UserMeetingRole.presenter,
];
const OPEN_AI_MODEL_TYPE = OpenAIModelType.davinci003;
const OPEN_AI_OPTIONS: OpenAICompletionOptions = {
    temperature: 1.0,
};

export const useMessages = (
    conversationId: string | undefined,
    conversation: IdeaConversation | undefined,
    localUser: LivePresenceUser<{ name: string }>,
) => {
    const [message, setMessage] = useSharedState<string>(
        `${conversationId}-message-body`,
        ""
    );
    const { map: messageMap, setEntry: setMessageMapEntry } =
        useSharedMap<ConversationMessage>(`${conversationId}-messages`);
    const onGetCompletion = useGetCompletion(
        OPEN_AI_MODEL_TYPE,
        OPEN_AI_OPTIONS
    );
    const [waitingState, , setWaitingState] = useLiveState<
        "waiting" | "not-waiting"
    >(`${conversationId}-waiting-state`);
    const { changePrompt, sendCompletion } = useLiveAICompletion(
        `${conversationId}-ai-messages`,
        onGetCompletion,
        ALLOWED_MEETING_ROLES
    );

    const onSendMessage = useCallback(async () => {
        if (
            waitingState === "waiting" ||
            typeof localUser.data?.name !== "string" ||
            !conversation ||
            !conversation.initialResponseText ||
            typeof message !== "string"
        )
            return;
        setWaitingState("waiting");
        const newMessage: ConversationMessage = {
            isGPT: false,
            senderName: localUser.data.name,
            message,
            sentAt: new Date().toISOString(),
        };
        setMessageMapEntry(uuid(), newMessage);
        setMessage("");
        const prefix = `${ConversationPrompt}\n\n`;
        const messageHistoryText = getMessageHistoryText(conversation, [
            ...messageMap.values(),
            newMessage,
        ]);
        const shortenedHistoryText = getShortenedOpenAIMessage(
            prefix,
            messageHistoryText
        );
        changePrompt(shortenedHistoryText);
        let responseMessage: ConversationMessage;
        try {
            const { completionValue } = await sendCompletion();
            responseMessage = {
                isGPT: true,
                senderName: "ChatGPT",
                message: completionValue
                    .split("AI: ")
                    .join("")
                    .split("AI:\n")
                    .join(""),
                sentAt: new Date().toISOString(),
            };
        } catch (error: any) {
            responseMessage = {
                isGPT: true,
                senderName: "ChatGPT",
                message:
                    typeof error.message === "string"
                        ? error.message
                        : "Error generating summary",
                sentAt: new Date().toISOString(),
            };
        }
        setMessageMapEntry(uuid(), responseMessage);
        setWaitingState("not-waiting");
    }, [
        waitingState,
        localUser.data?.name,
        conversationId,
        conversation,
        message,
        messageMap,
        setMessage,
        changePrompt,
        sendCompletion,
        setWaitingState,
        setMessageMapEntry,
    ]);

    return {
        message,
        messageMap,
        onSendMessage,
        setMessage,
        waitingForResponse: waitingState === "waiting",
    };
};
