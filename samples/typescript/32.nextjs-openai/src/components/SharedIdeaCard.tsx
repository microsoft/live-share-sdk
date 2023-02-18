import {
    Body1,
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
} from "@fluentui/react-components";
import { Card } from "@fluentui/react-components/unstable";
import {
    Delete16Regular,
    Heart16Regular,
    Heart16Filled,
    MoreHorizontal16Regular,
} from "@fluentui/react-icons";
import { useSharedMap, useSharedState } from "@microsoft/live-share-react";
import { FC, useEffect } from "react";
import { FlexColumn, FlexRow } from "./flex";

interface ISharedIdeaCardProps {
    ideaId: string;
    userId: string;
    userName: string;
    updateIdeaText: (uniqueKey: string, ideaText: string) => void;
    deleteIdea: (uniqueKey: string) => void;
    updateVoteCount: (uniqueKey: string, voteCount: number) => void;
}

export const SharedIdeaCard: FC<ISharedIdeaCardProps> = (props) => {
    const {
        ideaId,
        updateIdeaText,
        deleteIdea,
        updateVoteCount,
        userName,
        userId,
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
        deleteIdea(ideaId);
    };

    useEffect(() => {
        updateIdeaText(ideaId, text);
    }, [text]);

    useEffect(() => {
        updateVoteCount(ideaId, votesMap.size);
    }, [votesMap.size]);

    const localUserHasLiked = votesMap.has(userId);

    return (
        <Card appearance="filled-alternative">
            <FlexColumn marginSpacer>
                <Input value={text} placeholder={"Enter an idea..."} onChange={onChangeText} />
                <FlexRow spaceBetween vAlignCenter>
                    <FlexRow vAlignCenter marginSpacer>
                        <Avatar name={userName} color="colorful" size={20} />
                        <Caption1>{userName}</Caption1>
                    </FlexRow>
                    <FlexRow vAlignCenter>
                        <FlexRow vAlignCenter>
                            <Caption1>{votesMap.size}</Caption1>
                            <Button
                                appearance="subtle"
                                size="small"
                                icon={
                                    localUserHasLiked ? (
                                        <Heart16Filled />
                                    ) : (
                                        <Heart16Regular />
                                    )
                                }
                                onClick={onToggleLike}
                            />
                        </FlexRow>
                        <Menu>
                            <MenuTrigger>
                                <Button
                                    appearance="subtle"
                                    size="small"
                                    icon={<MoreHorizontal16Regular />}
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
