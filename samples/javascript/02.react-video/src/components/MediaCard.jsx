/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Card,
    CardPreview,
    CardFooter,
} from "@fluentui/react-components";
import { Image, Text, Button } from "@fluentui/react-components";
import { getFlexRowStyles } from "../styles/layouts";

export const MediaCard = ({ mediaItem, nowPlayingId, selectMedia }) => {
    const flexRowStyle = getFlexRowStyles();
    const buttonText =
        mediaItem.type === "video" ? "Watch together" : "Listen together";
    return (
        <Card
            appearance="filled"
            style={{
                padding: "0rem",
                minHeight: "0rem",
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
                    marginBottom: "0.8rem",
                }}
            >
                <Image
                    height={140}
                    fit="contain"
                    src={mediaItem.thumbnailImage}
                />
            </CardPreview>
            <Text size={400} weight="semibold">
                {mediaItem.title}
            </Text>
            <CardFooter
                styles={{
                    padding: "0px 12px",
                    minHeight: "0px",
                    minWidth: "0px",
                }}
            >
                <div className={flexRowStyle.root}>
                    <Button
                        appearance="outline"
                        size="small"
                        disabled={nowPlayingId === mediaItem.id}
                        onClick={() => {
                            selectMedia(mediaItem);
                        }}
                    >
                        {buttonText}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
