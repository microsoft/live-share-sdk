import { FC, useEffect } from "react";
import { Lightbulb20Regular } from "@fluentui/react-icons";
import { FlexRow } from "./flex";
import { getInitialPromptMessageText } from "@/utils";
import { useGetCompletion } from "@/hooks";
import { IdeaConversationInitialIdea } from "@/types/IdeaConversation";
import { RecommendedIdeasPrompt } from "@/constants/RecommendedIdeasPrompt";
import {
    useLiveCoPilot,
    useSharedState,
} from "@microsoft/live-share-react";
import { RecommendedIdeaButton } from "./RecommendedIdeaButton";
import { UserMeetingRole } from "@microsoft/live-share";
import { OpenAIModelType } from "@/types";

interface IIdeaRecommendationsProps {
    ideaBoardId: string;
    promptText: string;
    onAddIdea: (initialText?: string) => void;
    getSortedIdeas: () => IdeaConversationInitialIdea[];
}

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
const OPEN_AI_COMPLETION_OPTIONS = {
    temperature: 0.0,
    frequency_penalty: 1,
    presence_penalty: 1,
};

export const SharedIdeaRecommendations: FC<IIdeaRecommendationsProps> = (
    props
) => {
    const { ideaBoardId, promptText, onAddIdea, getSortedIdeas } = props;
    const [recommendedIdeas, setRecommendedIdeas] = useSharedState<string[]>(
        `${ideaBoardId}-recommended-ideas`,
        []
    );
    const onGetCompletion = useGetCompletion(
        OPEN_AI_MODEL_TYPE,
        OPEN_AI_COMPLETION_OPTIONS
    );

    const { liveCoPilot, completionValue, changePrompt } =
        useLiveCoPilot(
            `${ideaBoardId}-ai-recommended-ideas`,
            onGetCompletion,
            ALLOWED_MEETING_ROLES,
            DEFAULT_PROMPT_VALUE,
            AUTO_COMPLETIONS_ENABLED,
            DEFAULT_COMPLETIONS_DEBOUNCE_DELAY_MILLISECONDS,
            LOCK_PROMPT,
            LOCK_COMPLETION
        );

    useEffect(() => {
        if (promptText.length < 3 || !liveCoPilot?.haveCompletionLock)
            return;
        const sortedIdeas = getSortedIdeas();
        const recommendedIdeasPromptText =
            RecommendedIdeasPrompt +
            "/n" +
            getInitialPromptMessageText(promptText, sortedIdeas) +
            "/nSIMILAR IDEAS:";
        changePrompt(recommendedIdeasPromptText);
    }, [promptText, getSortedIdeas, changePrompt, liveCoPilot]);

    useEffect(() => {
        if (typeof completionValue === "string") {
            const trimmedResponseText = completionValue.trimStart();
            const ideas = trimmedResponseText
                .split(", ")
                .map((t) => t.trim())
                .filter((t) => !!t);
            setRecommendedIdeas(ideas.slice(0, Math.min(3, ideas.length)));
        }
    }, [completionValue, setRecommendedIdeas]);

    return (
        <FlexRow
            vAlignCenter
            wrap
            marginSpacer
            style={{
                paddingBottom: "8px",
            }}
        >
            <Lightbulb20Regular />
            {recommendedIdeas.map((ideaText, index) => (
                <RecommendedIdeaButton
                    key={`rec-idea-${index}`}
                    ideaText={ideaText}
                    onAddRecommendedIdea={onAddIdea}
                />
            ))}
        </FlexRow>
    );
};
