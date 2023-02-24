import { Idea } from "@/types/Idea";
import { FC, MutableRefObject, SetStateAction, useCallback } from "react";
import { SharedIdeaCard } from "./SharedIdeaCard";

interface ISharedIdeaListProps {
    ideasMap: ReadonlyMap<string, Idea>;
    ideaVotesMap: Map<string, number>;
    localUserId: string;
    ideaTags: string[];
    ideaTagsMapRef: MutableRefObject<Map<string, string[]>>;
    ideaTextMapRef: MutableRefObject<Map<string, string>>;
    searchQuickTagsRef: MutableRefObject<Map<string, string[]>>;
    deleteIdeaEntry: (key: string) => void;
    setIdeaVotesMap: (value: SetStateAction<Map<string, number>>) => void;
}

/**
 * List of `SharedIdeaCard`.
 */
export const SharedIdeaList: FC<ISharedIdeaListProps> = (props) => {
    const {
        ideasMap,
        ideaVotesMap,
        localUserId,
        ideaTags,
        ideaTagsMapRef,
        ideaTextMapRef,
        searchQuickTagsRef,
        deleteIdeaEntry,
        setIdeaVotesMap,
    } = props;

    const onUpdateVoteCount = useCallback(
        (key: string, voteCount: number) => {
            ideaVotesMap.set(key, voteCount);
            setIdeaVotesMap(new Map(ideaVotesMap));
        },
        [ideaVotesMap]
    );

    return (
        <>
            {[...ideasMap.entries()]
                .sort(([aId], [bId]) =>
                    ideaVotesMap.get(aId)! > ideaVotesMap.get(bId)! ? -1 : 1
                )
                .map(([key, value]) => {
                    return (
                        <SharedIdeaCard
                            key={key}
                            ideaId={key}
                            ideaTagsMapRef={ideaTagsMapRef}
                            ideaTextMapRef={ideaTextMapRef}
                            userId={localUserId}
                            userName={value.fallbackName}
                            ideaTags={ideaTags}
                            initialText={value.initialText || ""}
                            searchQuickTagsRef={searchQuickTagsRef}
                            deleteIdea={deleteIdeaEntry}
                            updateVoteCount={onUpdateVoteCount}
                        />
                    );
                })}
        </>
    );
};
