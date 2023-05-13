/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TabList, Tab } from "@fluentui/react-components";
import { MediaCard } from "./MediaCard";
import { useMemo, useState } from "react";
import { FlexItem, FlexRow } from "./flex";

export const TabbedList = ({
    mediaItems,
    browseItems,
    sharingActive,
    nowPlayingId,
    addMediaItem,
    removeMediaItem,
    selectMedia,
}) => {
    const [selectedValue, setSelectedValue] = useState("tab1");

    const onTabSelect = (event, data) => {
        setSelectedValue(data.value);
    };

    const filteredBrowseItems = useMemo(() => {
        return browseItems.filter(
            (browseItem) =>
                !mediaItems.find((mediaItem) => browseItem.id === mediaItem.id)
        );
    }, [browseItems, mediaItems]);

    return (
        <>
            <FlexItem noShrink>
                <FlexRow
                    vAlignCenter
                    style={{ width: "100%" }}
                >
                    <TabList
                        selectedValue={selectedValue}
                        onTabSelect={onTabSelect}
                    >
                        <Tab value="tab1">Playlist</Tab>
                        <Tab value="tab2">Browse</Tab>
                    </TabList>
                </FlexRow>
            </FlexItem>
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
                        nowPlayingId={null}
                        sharingActive={sharingActive}
                        buttonText="Add to playlist"
                        selectMedia={(item) => {
                            addMediaItem(item.id);
                            setSelectedValue("tab1");
                        }}
                    />
                ))}
        </>
    );
};
