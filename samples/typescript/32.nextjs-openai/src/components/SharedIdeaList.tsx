import { OrderedListPrompt } from "@/constants/OrderedListPrompt";
import { TagsPrompt } from "@/constants/TagsPrompt";
import { Idea } from "@/types/Idea";
import { IdeaConversationInitialIdea } from "@/types/IdeaConversation";
import { useDebounce } from "@/utils/debounce";
import { Button, Textarea, TextareaProps } from "@fluentui/react-components";
import { ArrowClockwise20Regular } from "@fluentui/react-icons";
import { LivePresenceUser } from "@microsoft/live-share";
import {
    SetLiveStateAction,
    useTaskManager,
    useSharedMap,
    useSharedState,
    useLiveState,
} from "@microsoft/live-share-react";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { FlexColumn, FlexRow } from "./flex";
import { ScrollView } from "./ScrollView";
import { SharedIdeaCard } from "./SharedIdeaCard";

interface ISharedIdeaListProps {
    ideaBoardId: string;
    leftOpen: boolean;
    rightOpen: boolean;
    localUser: LivePresenceUser<{ name: string }>;
    otherUsers: LivePresenceUser<{ name: string }>[];
    onDidStartNewConversation: (conversationId: string, initialPromptText: string, initialIdeas: IdeaConversationInitialIdea[]) => void;
    onDidGetResponse: (conversationId: string, initialResponseText: string) => void;
}

export const SharedIdeaList: FC<ISharedIdeaListProps> = (props) => {
    const {
        ideaBoardId,
        leftOpen,
        rightOpen,
        localUser,
        otherUsers,
        onDidStartNewConversation,
        onDidGetResponse,
    } = props;
    const [promptValue, setPromptValue] = useSharedState(
        `${ideaBoardId}-prompt`,
        ""
    );
    const ideaTextMapRef = useRef<Map<string, string>>(
        new Map<string, string>()
    );
    const [ideaVotesMap, setIdeaVotesMap] = useState<Map<string, number>>(
        new Map<string, number>()
    );
    const ideaTagsMapRef = useRef<Map<string, string[]>>(
        new Map<string, string[]>()
    );
    const { lockedTask } = useTaskManager(
        `${ideaBoardId}-task-manager`,
        "ai-summarizer"
    );
    const [tags, setTags] = useSharedState<string[]>(`${ideaBoardId}-tags`, []);
    const searchQuickTagsRef = useRef<Map<string, string[]>>(new Map<string, string[]>());

    const [loadingState, loadingData, setLoadingState] = useLiveState<string>(
        `${ideaBoardId}-loading`,
        undefined,
        "waiting"
    );
    const isLoading = loadingState === "loading";

    const {
        map: ideasMap,
        setEntry: setIdeaEntry,
        deleteEntry: deleteIdeaEntry,
    } = useSharedMap<Idea>(`${ideaBoardId}-ideas`);

    const onChangePrompt: TextareaProps["onChange"] = (ev, data) => {
        const characterCap = 3000 * 4;
        if (data.value.length <= characterCap) {
            setPromptValue(data.value);
        }
    };

    const onGenerateSummary = async () => {
        if (typeof promptValue !== "string") {
            console.error(new Error("Invalid prompt value"));
            return;
        }
        const conversationId = uuid();
        const sortedIdeas: IdeaConversationInitialIdea[] = [...ideaTextMapRef.current.entries()]
            .sort(([aId], [bId]) =>
                ideaVotesMap.get(aId)! > ideaVotesMap.get(bId)! ? -1 : 1
            )
            .map(([id, text]) => ({
                id,
                text,
                tags: ideaTagsMapRef.current.get(id) || [],
                votes: ideaVotesMap.get(id) || 0,
            }));
        onDidStartNewConversation(conversationId, promptValue, sortedIdeas);
        setLoadingState("loading");
        const fullGeneratePrompt =
            `${OrderedListPrompt}\[PREMISE START]:\n${promptValue}\n[PREMISE END]` +
            sortedIdeas
                .map((idea, index) => {
                        // let tagText = ideaTagsMapRef.current.get(id)?.join(", ") || "";
                        let tagText = "";
                        if (idea.tags) {
                            tagText = `<${idea.tags.join(", ")}> `;
                        }
                        return `${index + 1}. {{${idea.votes}}} HUMAN: ${tagText}${idea.text}`
                    }
                )
                .join("\n") +
            "\n[LIST END]\n";
        const response = await fetch("/api/openai/summary", {
            method: "POST",
            body: JSON.stringify({
                prompt: fullGeneratePrompt,
            }),
            headers: new Headers({
                "Content-Type": "application/json",
                Accept: "application/json",
            }),
        });
        try {
            const { responseText, error } = await response.json();
            if (error && typeof error === "string") {
                throw new Error(error);
            }
            if (typeof responseText !== "string") {
                throw new Error("Invalid response");
            }
            onDidGetResponse(conversationId, responseText);
        } catch (e: any) {
            onDidGetResponse(conversationId, e.message || "I'm sorry, something went wrong.");
        }
        setLoadingState("not-loading");
    };

    const onAddIdea = async () => {
        const newIdea: Idea = {
            createdAt: new Date().toISOString(),
            createdById: localUser!.userId,
            fallbackName: localUser!.data!.name!,
        };
        setIdeaEntry(uuid(), newIdea);
    };

    const onSearchTags = useCallback(async () => {
        if (promptValue.length > 5 && lockedTask) {
            console.log("searching tags");
            const fullGeneratePrompt =
                `${TagsPrompt}\nHUMAN: ${promptValue}\n`;
            const response = await fetch("/api/openai/summary", {
                method: "POST",
                body: JSON.stringify({
                    prompt: fullGeneratePrompt,
                    model: "text-curie-001"
                }),
                headers: new Headers({
                    "Content-Type": "application/json",
                    Accept: "application/json",
                }),
            });
            try {
                const { responseText, error } = await response.json();
                if (error && typeof error === "string") {
                    throw new Error(error);
                }
                
                if (typeof responseText !== "string") {
                    throw new Error("Invalid response: not string");
                }
                const trimmedResponseText = responseText.trimStart();
                if (!trimmedResponseText.startsWith("TAGS:")) {
                    throw new Error("Invalid responseL does not start with TAGS:");
                }
                const newTags = trimmedResponseText.replace("TAGS:", "").split(", ").map(t => t.trim()).filter((t) => !!t);
                setTags(newTags);
            } catch (e: any) {
                console.error(e);
            }
        }
    }, [lockedTask, promptValue]);

    const debounceSearchTags = useDebounce<void>(onSearchTags, 2500);

    useEffect(() => {
        debounceSearchTags();
    }, [lockedTask, promptValue]);

    return (
        <>
            <ScrollView
                style={{
                    position: "absolute",
                    left: 0,
                    right: rightOpen ? "50%" : 0,
                    bottom: 0,
                    top: "44px",
                    visibility: leftOpen ? "visible" : "hidden",
                }}
            >
                <FlexColumn
                    marginSpacer
                    style={{
                        paddingLeft: "24px",
                        paddingRight: "24px",
                        paddingTop: "24px",
                        paddingBottom: "56px",
                    }}
                >
                    <>
                        <Textarea
                            value={promptValue}
                            placeholder="Enter a prompt here..."
                            size="large"
                            resize="vertical"
                            onChange={onChangePrompt}
                        />
                        {[...ideasMap.entries()]
                            .sort(([aId], [bId]) =>
                                ideaVotesMap.get(aId)! > ideaVotesMap.get(bId)!
                                    ? -1
                                    : 1
                            )
                            .map(([key, value]) => {
                                const userName =
                                    otherUsers.find(
                                        (user) =>
                                            user.userId === value.createdById
                                    )?.data?.name || value.fallbackName;
                                return (
                                    <SharedIdeaCard
                                        key={key}
                                        ideaId={key}
                                        ideaTagsMapRef={ideaTagsMapRef}
                                        ideaTextMapRef={ideaTextMapRef}
                                        lockedTask={lockedTask}
                                        userId={localUser.userId}
                                        userName={userName}
                                        recommendedTags={tags}
                                        searchQuickTagsRef={searchQuickTagsRef}
                                        updateIdeaText={(
                                            uniqueKey,
                                            ideaText
                                        ) => {
                                            ideaTextMapRef.current.set(
                                                uniqueKey,
                                                ideaText
                                            );
                                        }}
                                        deleteIdea={(uniqueKey) => {
                                            ideaTextMapRef.current.delete(
                                                uniqueKey
                                            );
                                            deleteIdeaEntry(uniqueKey);
                                        }}
                                        updateVoteCount={(
                                            uniqueKey,
                                            voteCount
                                        ) => {
                                            ideaVotesMap.set(
                                                uniqueKey,
                                                voteCount
                                            );
                                            setIdeaVotesMap(
                                                new Map(ideaVotesMap)
                                            );
                                        }}
                                        updateTags={(
                                            uniqueKey,
                                            tags
                                        ) => {
                                            ideaTagsMapRef.current.set(
                                                uniqueKey,
                                                tags
                                            );
                                        }}
                                    />
                                );
                            })}
                        <Button onClick={onAddIdea}>{"Add idea"}</Button>
                    </>
                </FlexColumn>
            </ScrollView>
            <FlexRow
                hAlignCenter
                style={{
                    position: "absolute",
                    bottom: "0px",
                    left: "0px",
                    right: rightOpen ? "50%" : 0,
                    paddingBottom: "12px",
                    zIndex: 1,
                    visibility: leftOpen ? "visible" : "hidden",
                }}
            >
                <Button
                    appearance="primary"
                    icon={<ArrowClockwise20Regular />}
                    onClick={onGenerateSummary}
                    disabled={isLoading || !promptValue}
                >
                    {"Generate response"}
                </Button>
            </FlexRow>
        </>
    );
};
