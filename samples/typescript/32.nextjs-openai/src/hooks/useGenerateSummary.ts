import { TagsPrompt } from "@/constants/TagsPrompt";
import {
    IdeaConversationInitialIdea,
    OpenAICompletionOptions,
    OpenAIModelType,
} from "@/types";
import { UserMeetingRole } from "@microsoft/live-share";
import {
    useLiveCoPilot,
    useLiveState,
    useSharedState,
} from "@microsoft/live-share-react";
import { useCallback, useEffect } from "react";
import { useGetCompletion } from "./useGetCompletion";
import { v4 as uuid } from "uuid";
import { OrderedListPrompt } from "@/constants/OrderedListPrompt";
import { getInitialPromptMessageText } from "@/utils";

const ALLOWED_MEETING_ROLES = [
    UserMeetingRole.organizer,
    UserMeetingRole.presenter,
];
const OPEN_AI_MODEL_TYPE = OpenAIModelType.davinci003;
const OPEN_AI_OPTIONS: OpenAICompletionOptions = {
    temperature: 1.0,
};
const OPEN_AI_AUTO_COMPLETIONS_ENABLED = false;

export const useGenerateSummary = (
    ideaBoardId: string,
    promptText: string,
    getSortedIdeas: () => IdeaConversationInitialIdea[],
    onDidStartNewConversation: (
        conversationId: string,
        initialPromptText: string,
        initialIdeas: IdeaConversationInitialIdea[]
    ) => void,
    onDidGetResponse: (
        conversationId: string,
        initialResponseText: string
    ) => void
) => {
    const onGetCompletion = useGetCompletion(
        OPEN_AI_MODEL_TYPE,
        OPEN_AI_OPTIONS
    );
    const [loadingState, , setLoadingState] = useLiveState<
        "loading" | "not-loading"
    >(`${ideaBoardId}-loading`);
    const { changePrompt, sendCompletion } = useLiveCoPilot(
        `${ideaBoardId}-ai-summary`,
        onGetCompletion,
        ALLOWED_MEETING_ROLES,
        undefined,
        OPEN_AI_AUTO_COMPLETIONS_ENABLED
    );

    const onGenerateSummary = useCallback(async () => {
        if (typeof promptText !== "string") {
            console.error(new Error("Invalid prompt value"));
            return;
        }
        setLoadingState("loading");
        const conversationId = uuid();
        const sortedIdeas = getSortedIdeas();
        onDidStartNewConversation(conversationId, promptText, sortedIdeas);
        const initialPromptMessageText =
            OrderedListPrompt +
            "\n" +
            getInitialPromptMessageText(promptText, sortedIdeas);
        changePrompt(initialPromptMessageText);
        try {
            const { completionValue } = await sendCompletion();
            onDidGetResponse(conversationId, completionValue);
        } catch (error: any) {
            onDidGetResponse(
                conversationId,
                error.message || "I'm sorry, something went wrong."
            );
        }
        setLoadingState("not-loading");
    }, [
        changePrompt,
        getSortedIdeas,
        onDidGetResponse,
        onDidStartNewConversation,
        promptText,
        sendCompletion,
        setLoadingState,
    ]);

    return {
        isLoading: loadingState === "loading" || !promptText,
        onGenerateSummary,
    };
};
