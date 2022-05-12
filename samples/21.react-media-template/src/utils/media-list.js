/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const mediaList = [
    {
        id: 0,
        thumbnailImage: "https://by3302files.storage.live.com/y4m9tgZXn-22LyDf-IU2Wg_GMJE-JPMHbmO2fXO2DzI9ZGKYKguArpqcLTgmIOaIeaMDKoEDOOvYnIkHsys_Q7WvM8hHOGGJVwvHs1ksd12jiG8ZecJvevz_K7wE2VqqqG5Z3bZnDpuWvlolYmgzd_StHgYZodbmtHbNFrf5AUekdx8uNfDIptlP7Rqnt-mpO7P?width=1443&height=811&cropmode=none",
        title: "Hang Gliding",
        src: "https://msdemomedia-uswe.streaming.media.azure.net/340f8319-e3b9-4208-8444-81056a3eba41/pexels-cédric-estienne-6749146.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video"
    },
    {
        id: 1,
        thumbnailImage: "https://by3302files.storage.live.com/y4mV9-EMTt1QDowalx-_xGPQnpGOVzz4aGX5-2JLVxJumMJwCoz9_sr0GUcrHB3czzMkb4B9CT5PXKqqcP6vggZEjyEmxkaxB5JwaRanenu1pe9U72gnWtL09GdIskIgE_Bk-wqMS0BQGjKrqMclQWnKZQp8k2q4IwYK2Nc5gQNjpJdY0b-K6B3saItzcCG6NGH?width=256&height=144&cropmode=none",
        title: "Swiss Alps",
        src: "https://msdemomedia-uswe.streaming.media.azure.net/6847b84d-2e82-40c5-b296-ffa6164f7d6c/production ID_3818213.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video"
    },
];

export const searchList = [
    {
        id: 2,
        thumbnailImage: "https://by3302files.storage.live.com/y4mzi99em6H2SBgawxkOet8pPzlPhQC2L4RWj8-qK3wZBhL_Ybol_8p04L_in28Phl7_D9hOMjl97aEjD93ZB7X18COjmHysfs0bK93goF_FMDBBEJUXAHbmkgvUHFj45VWtEN3n6BSoXZlvZWQXYoDRoGtuBLVMK7wbFUoYxE6ZJR0i8xvycB7bEQ2eJ2iSuVR?width=256&height=136&cropmode=none",
        title: "Dog Days",
        src: "https://msdemomedia-uswe.streaming.media.azure.net/c739bb5a-8616-4d0f-b641-ceaed9d55dc0/pexels-zen-chung-5740700.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
]

function getInitialMediaId() {
    const url = new URL(window.location);
    const params = url.searchParams;
    return params.get("mediaId");
}

export function getInitialMediaItem() {
    const mediaId = getInitialMediaId();
    const mediaItem = mediaList.find((mediaItem) => `${mediaItem.id}` === mediaId);
    return mediaItem ? mediaItem : mediaList[0];
}
