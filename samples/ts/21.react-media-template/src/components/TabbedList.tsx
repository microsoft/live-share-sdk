/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    mergeClasses,
    TabList,
    Tab,
    SelectTabEventHandler,
    SelectTabEvent,
    SelectTabData,
} from "@fluentui/react-components";
import { getFlexItemStyles, getFlexRowStyles } from "../styles/layouts";
import { MediaCard } from "./MediaCard";
import { FC, useMemo, useState } from "react";
import { MediaItem } from "../utils/media-list";
import React from "react";

export const TabbedList: FC<{
    mediaItems: MediaItem[];
    browseItems: MediaItem[];
    sharingActive: boolean;
    nowPlayingId?: string;
    addMediaItem: (id: string) => void;
    removeMediaItem: (id: string) => void;
    selectMedia: (mediaItem: MediaItem) => void;
}> = ({
    mediaItems,
    browseItems,
    sharingActive,
    nowPlayingId,
    addMediaItem,
    removeMediaItem,
    selectMedia,
}) => {
    const [selectedValue, setSelectedValue] = useState<string>("tab1");

    const onTabSelect: SelectTabEventHandler = (
        event: SelectTabEvent,
        data: SelectTabData
    ) => {
        setSelectedValue(data.value as string);
    };

    const filteredBrowseItems = useMemo(() => {
        return browseItems.filter(
            (browseItem) =>
                !mediaItems.find((mediaItem) => browseItem.id === mediaItem.id)
        );
    }, [browseItems, mediaItems]);

    const flexRowStyles = getFlexRowStyles();
    const flexItemStyles = getFlexItemStyles();
    return (
        <>
            <div
                style={{ width: "100%" }}
                className={mergeClasses(
                    flexRowStyles.root,
                    flexRowStyles.vAlignCenter,
                    flexItemStyles.noShrink
                )}
            >
                <TabList
                    selectedValue={selectedValue}
                    onTabSelect={onTabSelect}
                >
                    <Tab value="tab1">Playlist</Tab>
                    <Tab value="tab2">Browse</Tab>
                </TabList>
            </div>
            {selectedValue === "tab1" &&
                mediaItems.map((mediaItem) => (
                    <MediaCard
                        key={`media-item-${mediaItem.id}`}
                        mediaItem={mediaItem}
                        nowPlayingId={nowPlayingId}
                        sharingActive={sharingActive}
                        buttonText="Watch together"
                        selectMedia={selectMedia}
                        removeMediaItem={removeMediaItem}
                    />
                ))}
            {selectedValue === "tab2" &&
                filteredBrowseItems.map((mediaItem) => (
                    <MediaCard
                        key={`browse-item-${mediaItem.id}`}
                        mediaItem={mediaItem}
                        nowPlayingId={undefined}
                        sharingActive={sharingActive}
                        buttonText="Add to playlist"
                        selectMedia={(item) => {
                            addMediaItem(item.id);
                            setSelectedValue("tab1");
                        }}
                        removeMediaItem={removeMediaItem}
                    />
                ))}
        </>
    );
};
