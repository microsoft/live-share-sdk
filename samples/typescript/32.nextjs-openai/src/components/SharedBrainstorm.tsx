import { TagsPrompt } from "@/constants/TagsPrompt";
import { Idea } from "@/types/Idea";
import { IdeaConversationInitialIdea } from "@/types/IdeaConversation";
import { getInitialPromptMessageText, getOpenAISummary } from "@/utils";
import { useDebounce } from "@/utils/debounce";
import { Button, Textarea, TextareaProps } from "@fluentui/react-components";
import { ArrowClockwise20Regular } from "@fluentui/react-icons";
import { LivePresenceUser } from "@microsoft/live-share";
import {
    useTaskManager,
    useSharedMap,
    useSharedState,
    useLiveState,
} from "@microsoft/live-share-react";
import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { FlexColumn, FlexRow } from "./flex";
import { ScrollView } from "./ScrollView";
import { SharedIdeaList } from "./SharedIdeaList";

interface ISharedBrainstormProps {
    ideaBoardId: string;
    leftOpen: boolean;
    rightOpen: boolean;
    localUser: LivePresenceUser<{ name: string }>;
    onDidStartNewConversation: (
        conversationId: string,
        initialPromptText: string,
        initialIdeas: IdeaConversationInitialIdea[]
    ) => void;
    onDidGetResponse: (
        conversationId: string,
        initialResponseText: string
    ) => void;
}

export const SharedBrainstorm: FC<ISharedBrainstormProps> = memo((props) => {
    const {
        ideaBoardId,
        leftOpen,
        rightOpen,
        localUser,
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
    const searchQuickTagsRef = useRef<Map<string, string[]>>(
        new Map<string, string[]>()
    );

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
        const sortedIdeas: IdeaConversationInitialIdea[] = [
            ...ideaTextMapRef.current.entries(),
        ]
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
        const initialPromptMessageText = getInitialPromptMessageText(
            promptValue,
            sortedIdeas
        );
        try {
            const responseText = await getOpenAISummary(
                initialPromptMessageText
            );
            onDidGetResponse(conversationId, responseText);
        } catch (e: any) {
            onDidGetResponse(
                conversationId,
                e.message || "I'm sorry, something went wrong."
            );
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
        if (promptValue.length > 1 && lockedTask) {
            console.log("searching tags");
            const fullGeneratePrompt = `${TagsPrompt}\nHUMAN: ${promptValue}\nTAGS:`;
            try {
                const responseText = await getOpenAISummary(
                    fullGeneratePrompt,
                    "text-curie-001"
                );
                const trimmedResponseText = responseText.trimStart();
                const newTags = trimmedResponseText
                    .split(", ")
                    .map((t) => t.trim())
                    .filter((t) => !!t);
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
                        <SharedIdeaList
                            ideaTagsMapRef={ideaTagsMapRef}
                            ideaTextMapRef={ideaTextMapRef}
                            lockedTask={lockedTask}
                            localUserId={localUser.userId}
                            ideaTags={tags}
                            searchQuickTagsRef={searchQuickTagsRef}
                            deleteIdeaEntry={deleteIdeaEntry}
                            setIdeaVotesMap={setIdeaVotesMap}
                            ideasMap={ideasMap}
                            ideaVotesMap={ideaVotesMap}
                        />
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
});
