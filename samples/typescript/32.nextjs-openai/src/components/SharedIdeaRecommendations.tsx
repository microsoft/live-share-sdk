import { FC, useCallback, useEffect } from "react";
import { Lightbulb20Regular } from "@fluentui/react-icons";
import { FlexRow } from "./flex";
import { Button } from "@fluentui/react-components";
import { getInitialPromptMessageText, getOpenAISummary, useDebounce } from "@/utils";
import { IdeaConversationInitialIdea } from "@/types/IdeaConversation";
import { RecommendedIdeasPrompt } from "@/constants/RecommendedIdeasPrompt";
import { useSharedState } from "@microsoft/live-share-react";
import { RecommendedIdeaButton } from "./RecommendedIdeaButton";

interface IIdeaRecommendationsProps {
    ideaBoardId: string;
    lockedTask: boolean;
    promptText: string;
    onAddIdea: (initialText?: string) => void;
    getSortedIdeas: () => IdeaConversationInitialIdea[];
}

export const SharedIdeaRecommendations: FC<IIdeaRecommendationsProps> = (
    props
) => {
    const { ideaBoardId, lockedTask, promptText, onAddIdea, getSortedIdeas } =
        props;
    const [recommendedIdeas, setRecommendedIdeas] = useSharedState<string[]>(
        `${ideaBoardId}-recommended-ideas`,
        []
    );

    const onAddRecommendedIdea = useCallback((ideaText: string) => {
        onAddIdea(ideaText);
    }, [onAddIdea]);

    const onGenerateRecommendedIdeas = useCallback(async () => {
        if (!lockedTask || promptText.length < 3) {
            return;
        }
        const sortedIdeas = getSortedIdeas();
        const recommendedIdeasPromptText =
            RecommendedIdeasPrompt +
            "/n" +
            getInitialPromptMessageText(promptText, sortedIdeas) +
            "/nSIMILAR IDEAS:";
        try {
            const responseText = await getOpenAISummary(
                recommendedIdeasPromptText
            );
            const trimmedResponseText = responseText.trimStart();
            const recommendedIdeas = trimmedResponseText
                .split(", ")
                .map((t) => t.trim())
                .filter((t) => !!t);
            setRecommendedIdeas(recommendedIdeas.slice(0, Math.min(3, recommendedIdeas.length)));
        } catch (error: any) {
            console.error(error);
        }
    }, [lockedTask, promptText, getSortedIdeas, setRecommendedIdeas]);

    const debounceRecommendIdeas = useDebounce<void>(onGenerateRecommendedIdeas, 2500);
    useEffect(() => {
        debounceRecommendIdeas();
    }, [debounceRecommendIdeas]);

    return (
        <FlexRow vAlignCenter wrap marginSpacer style={{
            paddingBottom: "8px",
        }}>
            <Lightbulb20Regular />
            {recommendedIdeas.map((ideaText, index) => (
                <RecommendedIdeaButton
                    key={`rec-idea-${index}`}
                    ideaText={ideaText}
                    onAddRecommendedIdea={onAddRecommendedIdea}
                />
            ))}
        </FlexRow>
    );
};
