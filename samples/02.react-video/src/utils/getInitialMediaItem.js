import { mediaList } from "./media-list";

function getInitialMediaId() {
  const url = new URL(window.location);
  const params = url.searchParams;
  return `${params.get("mediaId")}`;
}

export function getInitialMediaItem() {
  const mediaId = getInitialMediaId();
  const mediaItem = mediaId
    ? mediaList.find((mediaItem) => mediaItem.id === mediaId)
    : mediaList[0];
  return mediaItem;
}
