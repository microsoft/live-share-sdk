import { useGenerateSummary, useIdeaTags } from "@/hooks";
import { Idea } from "@/types/Idea";
import { IdeaConversationInitialIdea } from "@/types/IdeaConversation";
import { Button, Textarea, TextareaProps } from "@fluentui/react-components";
import { ArrowClockwise20Regular } from "@fluentui/react-icons";
import { LivePresenceUser } from "@microsoft/live-share";
import {
    useSharedMap,
    useSharedState,
} from "@microsoft/live-share-react";
import { FC, memo, useCallback, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { FlexColumn, FlexRow } from "./flex";
import { ScrollView } from "./ScrollView";
import { SharedIdeaList } from "./SharedIdeaList";
import { SharedIdeaRecommendations } from "./SharedIdeaRecommendations";

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
    const [promptText, setPromptText] = useSharedState(
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
    const { ideaTags } = useIdeaTags(ideaBoardId, promptText);
    const searchQuickTagsRef = useRef<Map<string, string[]>>(
        new Map<string, string[]>()
    );

    const getSortedIdeas = useCallback((): IdeaConversationInitialIdea[] => {
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
        return sortedIdeas;
    }, [ideaVotesMap]);

    const {
        isLoading,
        onGenerateSummary,
    } = useGenerateSummary(ideaBoardId, promptText, getSortedIdeas, onDidStartNewConversation, onDidGetResponse);

    const {
        map: ideasMap,
        setEntry: setIdeaEntry,
        deleteEntry: deleteIdeaEntry,
    } = useSharedMap<Idea>(`${ideaBoardId}-ideas`);

    const onChangePrompt: TextareaProps["onChange"] = (ev, data) => {
        const characterCap = 3000 * 4;
        if (data.value.length <= characterCap) {
            setPromptText(data.value);
        }
    };

    const onAddIdea = useCallback(async (initialText?: string) => {
        if (!localUser?.userId || !localUser?.data?.name) return;
        const newIdea: Idea = {
            createdAt: new Date().toISOString(),
            createdById: localUser!.userId,
            fallbackName: localUser!.data!.name!,
            initialText,
        };
        setIdeaEntry(uuid(), newIdea);
    }, [localUser?.userId, localUser?.data?.name, setIdeaEntry]);
    const onClickAddIdea = async () => {
        onAddIdea();
    };

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
                            value={promptText}
                            placeholder="Enter a prompt here..."
                            size="large"
                            resize="vertical"
                            onChange={onChangePrompt}
                        />
                        <SharedIdeaList
                            ideaTagsMapRef={ideaTagsMapRef}
                            ideaTextMapRef={ideaTextMapRef}
                            localUserId={localUser.userId}
                            ideaTags={ideaTags}
                            searchQuickTagsRef={searchQuickTagsRef}
                            deleteIdeaEntry={deleteIdeaEntry}
                            setIdeaVotesMap={setIdeaVotesMap}
                            ideasMap={ideasMap}
                            ideaVotesMap={ideaVotesMap}
                        />
                        <SharedIdeaRecommendations
                            ideaBoardId={ideaBoardId}
                            promptText={promptText}
                            onAddIdea={onAddIdea}
                            getSortedIdeas={getSortedIdeas}
                        />
                        <Button onClick={onClickAddIdea}>{"Add idea"}</Button>
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
                    disabled={isLoading || !promptText}
                >
                    {"Generate response"}
                </Button>
            </FlexRow>
        </>
    );
});
