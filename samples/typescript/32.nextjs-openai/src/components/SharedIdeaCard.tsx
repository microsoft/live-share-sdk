import { TagClassifierPrompt } from "@/constants/TagClassifierPrompt";
import { useGetCompletion } from "@/hooks";
import { OpenAICompletionOptions, OpenAIModelType } from "@/types";
import { getOpenAISummary, getRecommendedTagsText } from "@/utils";
import { useDebounce } from "@/utils/debounce";
import {
    Caption1,
    Button,
    Input,
    InputProps,
    Avatar,
    Menu,
    MenuTrigger,
    MenuList,
    MenuItem,
    MenuPopover,
    Body1,
    Caption1Stronger,
} from "@fluentui/react-components";
import { Card } from "@fluentui/react-components/unstable";
import {
    TagSearch20Regular,
    Delete16Regular,
    Heart20Regular,
    Heart20Filled,
    MoreHorizontal20Regular,
    Checkmark16Regular,
    Add16Regular,
} from "@fluentui/react-icons";
import { UserMeetingRole } from "@microsoft/live-share";
import {
    useLiveAICompletion,
    useSharedMap,
    useSharedState,
} from "@microsoft/live-share-react";
import { FC, MutableRefObject, useEffect } from "react";
import { FlexColumn, FlexRow } from "./flex";

interface ISharedIdeaCardProps {
    deleteIdea: (uniqueKey: string) => void;
    ideaId: string;
    ideaTagsMapRef: MutableRefObject<Map<string, string[]>>;
    ideaTextMapRef: MutableRefObject<Map<string, string>>;
    ideaTags: string[];
    initialText: string;
    updateVoteCount: (uniqueKey: string, voteCount: number) => void;
    userId: string;
    userName: string;
    searchQuickTagsRef: MutableRefObject<Map<string, string[]>>;
}

const ALLOWED_MEETING_ROLES = [
    UserMeetingRole.organizer,
    UserMeetingRole.presenter,
];
const AUTO_COMPLETIONS_ENABLED = true;
const DEFAULT_COMPLETIONS_DEBOUNCE_DELAY_MILLISECONDS = 2500;
const LOCK_PROMPT = true;
const LOCK_COMPLETION = true;
const OPEN_AI_MODEL_TYPE = OpenAIModelType.davinci003;
const OPEN_AI_OPTIONS: OpenAICompletionOptions = {
    temperature: 0.0,
};

export const SharedIdeaCard: FC<ISharedIdeaCardProps> = (props) => {
    const {
        deleteIdea,
        ideaId,
        ideaTagsMapRef,
        ideaTextMapRef,
        ideaTags,
        initialText,
        updateVoteCount,
        userId,
        userName,
        searchQuickTagsRef,
    } = props;
    const [text, setText, disposeText] = useSharedState<string>(
        `${ideaId}-text`,
        initialText
    );
    const {
        map: votesMap,
        setEntry: setVotesEntry,
        deleteEntry: deleteVoteEntry,
    } = useSharedMap(`${ideaId}-votes`);
    const {
        map: tagsMap,
        setEntry: setTagsEntry,
        deleteEntry: deleteTagsEntry,
    } = useSharedMap(`${ideaId}-tags`);
    const [
        quickRecommendTags,
        setQuickRecommendTags,
        disposeQuickRecommendedTags,
    ] = useSharedState<string[]>(`${ideaId}-quick-tags`, []);

    const onGetCompletion = useGetCompletion(
        OPEN_AI_MODEL_TYPE,
        OPEN_AI_OPTIONS
    );
    const {
        liveAICompletion,
        completionValue,
        changePrompt,
    } = useLiveAICompletion(
        `${ideaId}-ai-quick-tags`,
        onGetCompletion,
        ALLOWED_MEETING_ROLES,
        AUTO_COMPLETIONS_ENABLED,
        DEFAULT_COMPLETIONS_DEBOUNCE_DELAY_MILLISECONDS,
        LOCK_PROMPT,
        LOCK_COMPLETION
    );

    const onChangeText: InputProps["onChange"] = (ev, data) => {
        const characterCap = 3000 * 4;
        if (data.value.length <= characterCap) {
            searchQuickTagsRef.current.delete(text);
            setText(data.value);
        }
    };

    const onToggleLike = () => {
        if (localUserHasLiked) {
            deleteVoteEntry(userId);
        } else {
            setVotesEntry(userId, {});
        }
    };

    const onDelete = () => {
        deleteIdea(ideaId);
        disposeText();
        [...votesMap.keys()].forEach((key) => {
            deleteVoteEntry(key);
        });
        [...tagsMap.keys()].forEach((key) => {
            deleteTagsEntry(key);
        });
        disposeQuickRecommendedTags();
        searchQuickTagsRef.current.delete(text);
        ideaTagsMapRef.current.delete(ideaId);
        ideaTextMapRef.current.delete(ideaId);
    };

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

    useEffect(() => {
        ideaTextMapRef.current.set(ideaId, text);
    }, [ideaId, text]);

    useEffect(() => {
        updateVoteCount(ideaId, votesMap.size);
    }, [votesMap.size]);

    useEffect(() => {
        ideaTagsMapRef.current.set(ideaId, [...tagsMap.keys()]);
    }, [ideaId, tagsMap.size]);

    const localUserHasLiked = votesMap.has(userId);

    return (
        <Card appearance="filled-alternative">
            <FlexColumn marginSpacer>
                <FlexRow
                    vAlignCenter
                    marginSpacer
                    wrap
                    style={{ marginBottom: "12px" }}
                >
                    <Menu>
                        <MenuTrigger>
                            <Button
                                icon={<TagSearch20Regular />}
                                appearance="subtle"
                                size="small"
                            />
                        </MenuTrigger>
                        <MenuPopover>
                            <MenuList hasIcons>
                                {ideaTags.map((tag) => (
                                    <MenuItem
                                        key={tag}
                                        icon={
                                            tagsMap.has(tag) ? (
                                                <Checkmark16Regular />
                                            ) : (
                                                <Add16Regular />
                                            )
                                        }
                                        onClick={() => {
                                            if (tagsMap.has(tag)) {
                                                deleteTagsEntry(tag);
                                            } else {
                                                setTagsEntry(tag, {});
                                            }
                                        }}
                                    >{`#${tag}`}</MenuItem>
                                ))}
                            </MenuList>
                        </MenuPopover>
                    </Menu>
                    {[...tagsMap.keys()].map((tag) => (
                        <Caption1 key={tag}>{`#${tag}`}</Caption1>
                    ))}
                    {quickRecommendTags
                        .filter((tag) => !tagsMap.has(tag))
                        .map((tag) => (
                            <FlexRow vAlignCenter key={tag}>
                                <Button
                                    appearance="subtle"
                                    icon={<Checkmark16Regular />}
                                    size="small"
                                    onClick={() => {
                                        setTagsEntry(tag, {});
                                    }}
                                />
                                <Caption1Stronger>{`#${tag}`}</Caption1Stronger>
                            </FlexRow>
                        ))}
                </FlexRow>
                <Input
                    value={text}
                    placeholder={"Enter an idea..."}
                    onChange={onChangeText}
                />
                <FlexRow spaceBetween vAlignCenter style={{ marginTop: "4px" }}>
                    <FlexRow vAlignCenter marginSpacer>
                        <Avatar name={userName} color="colorful" size={24} />
                        <Body1>{userName}</Body1>
                    </FlexRow>
                    <FlexRow vAlignCenter>
                        <FlexRow vAlignCenter>
                            <Body1>{votesMap.size}</Body1>
                            <Button
                                appearance="subtle"
                                icon={
                                    localUserHasLiked ? (
                                        <Heart20Filled />
                                    ) : (
                                        <Heart20Regular />
                                    )
                                }
                                onClick={onToggleLike}
                            />
                        </FlexRow>
                        <Menu>
                            <MenuTrigger>
                                <Button
                                    appearance="subtle"
                                    icon={<MoreHorizontal20Regular />}
                                    title="More options"
                                />
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    <MenuItem
                                        icon={<Delete16Regular />}
                                        title="Delete idea"
                                        onClick={onDelete}
                                    >
                                        {"Delete"}
                                    </MenuItem>
                                </MenuList>
                            </MenuPopover>
                        </Menu>
                    </FlexRow>
                </FlexRow>
            </FlexColumn>
        </Card>
    );
};
