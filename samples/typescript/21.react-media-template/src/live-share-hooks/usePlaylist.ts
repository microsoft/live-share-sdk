import { useEffect, useState, useCallback } from "react";
import { MediaItem, searchList } from "../utils/media-list";
import { debounce } from "lodash";
import { SharedMap } from "fluid-framework";

/**
 * Hook for tracking video playlist
 *
 * @remarks
 *
 * @param {LivePresence} presence presence object from Fluid container.
 * @param {(string) => void} sendNotification callback method to send a notification through the useNotifications hook.
 * @returns `{playlistStarted, mediaItems, selectedMediaItem, addMediaItem, selectMediaId, nextTrack}` where:
 * - `playlistStarted` is a boolean indicating whether `playlistMap` event listeners were registered.
 * - `mediaItems` is the list of media items.
 * - `selectedMediaItem` is the currently selected media item.
 * - `addMediaItem` is a callback method for adding a media item to the playlist.
 * - `selectMediaId` is a callback method for persisting the media item users intend to watch.
 * - `nextTrack` is a callback method for selecting the next video in the playlist.
 */
export const usePlaylist = (
    sendNotification: (text: string) => void,
    playlistMap?: SharedMap
) => {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [selectedId, setSelectedId] = useState();
    const [playlistStarted, setStarted] = useState(false);

    const selectedMediaIndex = mediaItems.findIndex(
        (item) => item.id === selectedId
    );

    const addMediaItem = useCallback(
        (id: string) => {
            if (!mediaItems.find((item) => item.id === id)) {
                const itemToAdd = searchList.find((item) => item.id === id);
                if (itemToAdd) {
                    playlistMap?.set(id, itemToAdd);
                    if (sendNotification) {
                        sendNotification("added a video to the playlist");
                    }
                }
            }
        },
        [mediaItems, playlistMap, sendNotification]
    );

    const removeMediaItem = useCallback(
        (id: string) => {
            playlistMap?.delete(id);
        },
        [playlistMap]
    );

    const selectMediaId = useCallback(
        (id: string) => {
            playlistMap?.set("selected-media-id", id);
        },
        [playlistMap]
    );

    const nextTrack = useCallback(() => {
        if (mediaItems.length > 1) {
            let incrementIndex = selectedMediaIndex + 1;
            if (incrementIndex >= mediaItems.length) {
                incrementIndex = 0;
            }
            selectMediaId(mediaItems[incrementIndex].id);
        }
    }, [selectedMediaIndex, mediaItems, selectMediaId]);

    const refreshMediaItems = useCallback(() => {
        const items: MediaItem[] = [];
        playlistMap?.forEach((value, key) => {
            if (key === "selected-media-id") {
                setSelectedId(value);
            } else {
                items.push(value);
            }
        });
        setMediaItems(items);
    }, [playlistMap, setMediaItems, setSelectedId]);

    // eslint-disable-next-line
    const debouncedRefresh = useCallback(debounce(refreshMediaItems, 100), [
        refreshMediaItems,
    ]);

    useEffect(() => {
        if (playlistMap && !playlistStarted) {
            playlistMap.on("valueChanged", debouncedRefresh);
            debouncedRefresh();
            console.log("usePlaylist: started playlist");
            setStarted(true);
        }
    }, [playlistMap, playlistStarted, setStarted, debouncedRefresh]);

    const selectedMediaItem =
        selectedMediaIndex >= 0 && mediaItems.length > selectedMediaIndex
            ? mediaItems[selectedMediaIndex]
            : undefined;

    return {
        playlistStarted,
        mediaItems,
        selectedMediaItem,
        addMediaItem,
        removeMediaItem,
        selectMediaId,
        nextTrack,
    };
};
