import { TagClassifierPrompt } from "@/constants/TagClassifierPrompt";
import { ConversationMessage } from "@/types/ConversationMessage";
import {
    IdeaConversation,
    IdeaConversationInitialIdea,
} from "@/types/IdeaConversation";
import { MutableRefObject } from "react";

/**
 * Get a formatted message text for the initial prompt
 *
 * @param initialPromptText message generated via prompt field, which appears before the list of ideas
 * @param ideas ideas generated via the ideas list
 * @param isMachineReadable if true, the message will be formatted for AI readability. Otherwise, it will be rendered for human readability.
 * @returns string with the formatted message text for the prompt
 */
export const getInitialPromptMessageText = (
    initialPromptText: string,
    ideas: IdeaConversationInitialIdea[],
    isMachineReadable: boolean = true
) => {
    if (isMachineReadable) {
        return (
            `[PREMISE START]:\n${initialPromptText}\n[PREMISE END]` +
            ideas
                .map((idea, index) => {
                    let tagText = "";
                    if (idea.tags) {
                        tagText = `<${idea.tags.join(", ")}> `;
                    }
                    return `${index + 1}. {{${idea.votes}}} HUMAN: ${tagText}${
                        idea.text
                    }`;
                })
                .join("\n") +
            "\n[LIST END]\n"
        );
    }
    return (
        `${initialPromptText}\n` +
        ideas
            .map((idea, index) => {
                const tagsText =
                    idea.tags.length > 0 ? ` #${idea.tags.join(" ")}` : "";
                const votesText = idea.votes > 0 ? ` ❤️${idea.votes}` : "";
                return `  ${index + 1}. ${idea.text}${tagsText}${votesText}`;
            })
            .join("\n")
    );
};

/**
 * Get a formatted message text for prompt & message history for the AI to parse and generate a response
 *
 * @param conversation conversation object
 * @param messageHistory list of conversation messages
 * @returns formatted message history text
 */
export const getMessageHistoryText = (
    conversation: IdeaConversation,
    messageHistory: ConversationMessage[]
) => {
    const initialPromptMessageText = getInitialPromptMessageText(
        conversation.initialPromptText,
        conversation.initialIdeas
    );
    return (
        `HUMAN:\n${initialPromptMessageText}\n` +
        `AI: ${conversation.initialResponseText ?? ""}\n` +
        messageHistory
            .map(
                (conversationMessage) =>
                    `${conversationMessage.isGPT ? "AI" : "HUMAN"}: ${
                        conversationMessage.message
                    }`
            )
            .join("\n") +
        "\n"
    );
};

export const getRecommendedTagsText = (
    ideaId: string,
    ideaTagsMapRef: MutableRefObject<Map<string, string[]>>,
    ideaTextMapRef: MutableRefObject<Map<string, string>>,
    ideaTags: string[],
    ideaText: string
) => {
    const ideaTagsText = `\nTAGS: ${ideaTags.join(", ")}\n`;
    const existingValuesClassifierText = [...ideaTagsMapRef.current.entries()]
        .filter(([key]) => key !== ideaId)
        .map(
            ([key, value]) =>
                `\n###${ideaTagsText}INPUT: ${ideaTextMapRef.current.get(
                    key
                )}\nRESPONSE TAGS: ${value.join(", ")}\n###\n`
        );
    return `${TagClassifierPrompt}${existingValuesClassifierText}${ideaTagsText}INPUT: ${ideaText}\nRESPONSE TAGS:`;
};
