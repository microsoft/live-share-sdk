import { OpenAICompletionOptions, OpenAIModelType } from "@/types";
import { getRecommendedTagsText } from "@/utils";
import { UserMeetingRole } from "@microsoft/live-share";
import {
    useLiveAICompletion,
    useSharedState,
} from "@microsoft/live-share-react";
import { MutableRefObject, useEffect } from "react";
import { useGetCompletion } from "./useGetCompletion";

const ALLOWED_MEETING_ROLES = [
    UserMeetingRole.organizer,
    UserMeetingRole.presenter,
];
const DEFAULT_PROMPT_VALUE = "";
const AUTO_COMPLETIONS_ENABLED = true;
const DEFAULT_COMPLETIONS_DEBOUNCE_DELAY_MILLISECONDS = 2500;
const LOCK_PROMPT = true;
const LOCK_COMPLETION = true;
const OPEN_AI_MODEL_TYPE = OpenAIModelType.davinci003;
const OPEN_AI_OPTIONS: OpenAICompletionOptions = {
    temperature: 0.0,
};

export const useQuickTags = (
    ideaId: string,
    text: string,
    searchQuickTagsRef: MutableRefObject<Map<string, string[]>>,
    ideaTagsMapRef: MutableRefObject<Map<string, string[]>>,
    ideaTextMapRef: MutableRefObject<Map<string, string>>,
    ideaTags: string[]
) => {
    const [
        quickRecommendTags,
        setQuickRecommendTags,
        disposeQuickRecommendedTags,
    ] = useSharedState<string[]>(`${ideaId}-quick-tags`, []);

    const onGetCompletion = useGetCompletion(
        OPEN_AI_MODEL_TYPE,
        OPEN_AI_OPTIONS
    );
    const { liveAICompletion, completionValue, changePrompt } =
        useLiveAICompletion(
            `${ideaId}-ai-quick-tags`,
            onGetCompletion,
            ALLOWED_MEETING_ROLES,
            DEFAULT_PROMPT_VALUE,
            AUTO_COMPLETIONS_ENABLED,
            DEFAULT_COMPLETIONS_DEBOUNCE_DELAY_MILLISECONDS,
            LOCK_PROMPT,
            LOCK_COMPLETION
        );

    useEffect(() => {
        if (!text || !liveAICompletion?.haveCompletionLock) return;
        const existingQuickTags = searchQuickTagsRef.current.get(text);
        if (existingQuickTags !== undefined) {
            if (
                quickRecommendTags.every((tag) =>
                    existingQuickTags.includes(tag)
                )
            ) {
                return;
            }
            setQuickRecommendTags(existingQuickTags);
            return;
        }
        const recommendedTagsText = getRecommendedTagsText(
            ideaId,
            ideaTagsMapRef,
            ideaTextMapRef,
            ideaTags,
            text
        );
        changePrompt(recommendedTagsText);
    }, [text, setQuickRecommendTags, changePrompt, liveAICompletion]);

    useEffect(() => {
        if (typeof completionValue === "string") {
            const trimmedResponseText = completionValue.trimStart();
            const newTags = trimmedResponseText
                .split(", ")
                .map((t) => t.trim())
                .filter((t) => !!t);
            setQuickRecommendTags(newTags);
            searchQuickTagsRef.current.set(text, newTags);
        }
    }, [completionValue]);

    return {
        quickRecommendTags,
        disposeQuickRecommendedTags,
    };
};
