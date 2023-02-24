export type IdeaConversationInitialIdea = {
    id: string;
    text: string;
    votes: number;
    tags: string[];
};

export type IdeaConversation = {
    createdAt: string;
    initialPromptText: string;
    initialIdeas: IdeaConversationInitialIdea[];
    initialResponseText?: string;
};
