import { useCallback } from "react";
import { MediaItem, searchList } from "../utils/media-list";
import { useSharedMap, useSharedState } from "@microsoft/live-share-react";
import { UNIQUE_KEYS } from "../constants";
import { mediaList } from "../utils/media-list";

/**
 * Hook for tracking video playlist
 */
export const usePlaylist = () => {
    const {
        map: playlistMap,
        setEntry,
        deleteEntry: removeMediaItem,
        sharedMap,
    } = useSharedMap<MediaItem>(UNIQUE_KEYS.playlist, getInitialData());
    const [selectedId, selectMediaId] = useSharedState<string | undefined>(
        UNIQUE_KEYS.selectedVideoId,
        mediaList[0].id
    );
    const mediaItems: MediaItem[] = [...playlistMap.values()];

    const selectedMediaIndex = mediaItems.findIndex(
        (item) => item.id === selectedId
    );

    const addMediaItem = useCallback(
        (id: string) => {
            if (playlistMap.has(id)) return;
            const itemToAdd = searchList.find((item) => item.id === id);
            if (!itemToAdd) return;
            setEntry(id, itemToAdd);
        },
        [playlistMap, setEntry]
    );

    const nextTrack = useCallback(() => {
        if (mediaItems.length <= 1) return;
        let incrementIndex = selectedMediaIndex + 1;
        if (incrementIndex >= mediaItems.length) {
            incrementIndex = 0;
        }
        selectMediaId(mediaItems[incrementIndex].id);
    }, [selectedMediaIndex, mediaItems, selectMediaId]);

    const selectedMediaItem =
        selectedMediaIndex >= 0 && mediaItems.length > selectedMediaIndex
            ? mediaItems[selectedMediaIndex]
            : undefined;

    return {
        playlistStarted: !!sharedMap,
        mediaItems,
        selectedMediaItem,
        addMediaItem,
        removeMediaItem,
        selectMediaId,
        nextTrack,
    };
};

function getInitialData(): Map<string, MediaItem> {
    const map = new Map<string, MediaItem>();
    const initialItem = mediaList[0];
    map.set(initialItem.id, initialItem);
    return map;
}
