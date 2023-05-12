/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Card, CardPreview, CardFooter } from "@fluentui/react-components";
import { Image, Text, Button, mergeClasses } from "@fluentui/react-components";
import { Delete20Regular } from "@fluentui/react-icons";
import { getFlexRowStyles, getFlexItemStyles } from "../styles/layouts";
import { FC } from "react";
import { MediaItem } from "../utils/media-list";
import React from "react";

export const MediaCard: FC<{
    mediaItem: MediaItem;
    nowPlayingId?: string;
    sharingActive: boolean;
    buttonText: string;
    selectMedia: (mediaItem: MediaItem) => void;
    removeMediaItem: (id: string) => void;
}> = ({
    mediaItem,
    nowPlayingId,
    sharingActive,
    buttonText,
    selectMedia,
    removeMediaItem,
}) => {
    const flexRowStyle = getFlexRowStyles();
    const flexItemStyles = getFlexItemStyles();
    return (
        <div className={flexItemStyles.noShrink}>
            <Card
                appearance="filled"
                style={{
                    padding: "0rem",
                    minHeight: "0px",
                    minWidth: "0px",
                    width: "100%",
                    height: "100%",
                    margin: "0rem",
                    cursor: "default",
                    border: "none",
                }}
            >
                <CardPreview
                    style={{
                        minHeight: "0px",
                        maxHeight: "140px",
                        overflow: "hidden",
                        marginBottom: "0.4rem",
                    }}
                >
                    <Image
                        height={140}
                        fit="contain"
                        src={mediaItem.thumbnailImage}
                        style={{ minHeight: "0px" }}
                    />
                </CardPreview>
                <div
                    style={{
                        minHeight: "0px",
                        paddingLeft: "0.8rem",
                        paddingRight: "0.8rem",
                    }}
                >
                    <Text size={400} weight="semibold">
                        {mediaItem.title}
                    </Text>
                </div>
                <CardFooter
                    style={{
                        padding: "0rem",
                        minHeight: "0px",
                        minWidth: "0px",
                    }}
                >
                    <div
                        className={mergeClasses(
                            flexRowStyle.root,
                            flexRowStyle.vAlignCenter
                        )}
                        style={{
                            width: "100%",
                            paddingLeft: "0.8rem",
                            paddingRight: "0.8rem",
                            paddingBottom: "1.2rem",
                            paddingTop: "0rem",
                        }}
                    >
                        <div className={flexItemStyles.grow}>
                            <Button
                                appearance="outline"
                                size="small"
                                disabled={
                                    nowPlayingId === mediaItem.id &&
                                    sharingActive
                                }
                                onClick={() => {
                                    selectMedia(mediaItem);
                                }}
                            >
                                {buttonText}
                            </Button>
                        </div>
                        {!!removeMediaItem && (
                            <Button
                                appearance="subtle"
                                size="small"
                                icon={<Delete20Regular />}
                                title={"Remove from playlist"}
                                onClick={() => {
                                    removeMediaItem(mediaItem.id);
                                }}
                            />
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};
