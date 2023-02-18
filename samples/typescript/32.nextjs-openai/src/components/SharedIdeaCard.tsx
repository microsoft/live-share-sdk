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
import { useSharedMap, useSharedState } from "@microsoft/live-share-react";
import { FC, useEffect } from "react";
import { FlexColumn, FlexRow } from "./flex";

interface ISharedIdeaCardProps {
    deleteIdea: (uniqueKey: string) => void;
    ideaId: string;
    recommendedTags: string[];
    updateIdeaText: (uniqueKey: string, ideaText: string) => void;
    updateVoteCount: (uniqueKey: string, voteCount: number) => void;
    updateTags: (uniqueKey: string, tags: string[]) => void;
    userId: string;
    userName: string;
}

export const SharedIdeaCard: FC<ISharedIdeaCardProps> = (props) => {
    const {
        deleteIdea,
        ideaId,
        recommendedTags,
        updateIdeaText,
        updateVoteCount,
        updateTags,
        userId,
        userName,
    } = props;
    const [text, setText, disposeText] = useSharedState<string>(
        `${ideaId}-text`,
        ""
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

    const onChangeText: InputProps["onChange"] = (ev, data) => {
        const characterCap = 3000 * 4;
        if (data.value.length <= characterCap) {
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
        disposeText();
        [...votesMap.keys()].forEach((key) => {
            deleteVoteEntry(key);
        });
        [...tagsMap.keys()].forEach((key) => {
            deleteTagsEntry(key);
        });
        deleteIdea(ideaId);
    };

    useEffect(() => {
        updateIdeaText(ideaId, text);
    }, [text]);

    useEffect(() => {
        updateVoteCount(ideaId, votesMap.size);
    }, [votesMap.size]);

    useEffect(() => {
        updateTags(ideaId, [...tagsMap.keys()]);
    }, [tagsMap.size]);

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
                                {recommendedTags.map((tag) => (
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
