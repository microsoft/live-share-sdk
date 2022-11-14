import { useEffect, useState, useCallback, useMemo } from "react";
import { searchList } from "../utils/media-list";
import { debounce } from "lodash";

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
export const usePlaylist = (playlistMap, sendNotification) => {
    const [mediaItems, setMediaItems] = useState([]);
    const [selectedId, setSelectedId] = useState();
    const [playlistStarted, setStarted] = useState(false);

    const selectedMediaIndex = useMemo(() => {
        return mediaItems.findIndex((item) => item.id === selectedId);
    }, [selectedId, mediaItems]);

    const addMediaItem = useCallback(
        (id) => {
            if (!mediaItems.find((item) => item.id === id)) {
                const itemToAdd = searchList.find((item) => item.id === id);
                if (itemToAdd) {
                    playlistMap.set(id, itemToAdd);
                    if (sendNotification) {
                        sendNotification("added a video to the playlist");
                    }
                }
            }
        },
        [mediaItems, playlistMap, sendNotification]
    );

    const removeMediaItem = useCallback(
        (id) => {
            playlistMap.delete(id);
        },
        [playlistMap]
    );

    const selectMediaId = useCallback(
        (id) => {
            playlistMap.set("selected-media-id", id);
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
        const items = [];
        playlistMap.forEach((value, key) => {
            if (key === "selected-media-id") {
                setSelectedId(value);
            } else {
                items.push(value);
            }
        });
        setMediaItems(items);
    }, [playlistMap, setMediaItems, setSelectedId]);

    // eslint-disable-next-line
  const debouncedRefresh = useCallback(debounce(refreshMediaItems, 100), [refreshMediaItems]);

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
            : null;

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
