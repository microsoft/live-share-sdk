/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type MediaItem = {
    id: string;
    thumbnailImage: string;
    title: string;
    src: string;
    type: string;
};

export const mediaList: MediaItem[] = [
    {
        id: "0",
        thumbnailImage:
            "https://by3302files.storage.live.com/y4mohyKkLvuC6HfaeJbCtX1gnRdCHlLpJe1n6L4OLkd4z9ljbC_w-vcL0RJjs0k5IJvVY3AcJ1O0wmfG_Bwzs7CUCwqTTwuPNej7MiIbXqQDySexIq_qRUVK7v68bA4glUS6UBn-lmZBfiWI51h63-tZvhwtso6_55F1xjvo6z02v-K5yp56mTi0LsWPLblOPxL?width=660&height=371&cropmode=none",
        title: "Teams Channel Trailer",
        src: "https://livesharemedia-usw22.streaming.media.azure.net/d636cbe2-5e4a-419b-958e-6cc81dd3ca72/15 - Channel Trailer V8.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
];

export const searchList: MediaItem[] = [
    ...mediaList,
    {
        id: "1",
        thumbnailImage:
            "https://by3302files.storage.live.com/y4mJHPKYRDVa0Tq0tEL0MLkNp8Od4hPhcYudyjGdnU7DgErpEgEAflpu3f4QLCa5BjIwE11D2R3iKGauB3I0pbJDKSKrc6hMCB46pMB7fdsmbiAao0C5RmXOfzEZKcX6dFwQiIod2G0zeyfRL2akN9A8jw0Pf-sGWnKkXE-nMWv8-42_jM88n-F3PooGSSKaAyH?width=660&height=372&cropmode=none",
        title: "Onboarding to Teams Apps",
        src: "https://livesharemedia-usw22.streaming.media.azure.net/8bf16f5f-d4b0-437b-8121-d780abe744c9/Onboarding_Video11_Final_H264.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
    {
        id: "2",
        thumbnailImage:
            "https://by3302files.storage.live.com/y4mUBBvkvbh4U8GCw-auQJ4c0e9AoU9jk7OmqL1HoI5uv0ah2IVSngvGqhg4l-1P2w2rA1CqunF16uhBvYU_FXRpQq_UtsDg6cXovkskMxi-3tO-_r41HJg6Y2a_u0qkUl1amExyG7yl3Q8fmAvMRrXEg5D1ouyYX82YP9BqQDRFJlgVx9tCFk-jfLGVO1nMIru?width=660&height=369&cropmode=none",
        title: "3 app tips in Teams",
        src: "https://livesharemedia-usw22.streaming.media.azure.net/113f04f1-5e06-45f5-be52-b848aa3f7afe/71372_teams_tip_three_apps_chat_.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
    {
        id: "3",
        thumbnailImage:
            "https://by3302files.storage.live.com/y4mvA_fpovY-RkRbEAK3JFfyFJIJaikw2iFDNYeAPncjPRJ7jRfiJyVFiSk9Sq5qNXS7NpzBgBP9NHFr_I2KMs8qUgxkGTPebP86JQOHuezGclUtVPsmtzfA-7yYWJxFsRowzB6v6okwDQdC9il2Xq6183WBGgKWCwiCTX0HZ9ELVQFdUwfgxTK5BwEb79r_mPh?width=660&height=370&cropmode=none",
        title: "Reply to a message demo",
        src: "https://livesharemedia-usw22.streaming.media.azure.net/8961cf76-8e34-440f-b52d-e50601d8cf61/Reply_To_A_Message_Aisha_MASTER.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
    {
        id: "4",
        thumbnailImage:
            "https://by3302files.storage.live.com/y4mL6V3p0Sqx7xCXX96BYtVxG-GSNNQ573Cc_SP769NWcpdjhhfOG9ZjzlndGQBqeoEkVARmtoW0rwyRe3Up7ldUin3YUhte0MSh5aYpxi68IDDJ19drmIDC6VF_h3w_2tPANAl27g15f4w42aANYhPM4VyeREVKp3ItAUNoULO6NXbQPooDXpfQMN4fYuNdqL6?width=660&height=374&cropmode=none",
        title: "Standout presenter demo",
        src: "https://livesharemedia-usw22.streaming.media.azure.net/a0e332ba-4b9c-4172-a7e4-f74e32eff698/Standout_Presenter_Aisha_MASTER.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
    {
        id: "5",
        thumbnailImage:
            "https://by3302files.storage.live.com/y4m9tgZXn-22LyDf-IU2Wg_GMJE-JPMHbmO2fXO2DzI9ZGKYKguArpqcLTgmIOaIeaMDKoEDOOvYnIkHsys_Q7WvM8hHOGGJVwvHs1ksd12jiG8ZecJvevz_K7wE2VqqqG5Z3bZnDpuWvlolYmgzd_StHgYZodbmtHbNFrf5AUekdx8uNfDIptlP7Rqnt-mpO7P?width=1443&height=811&cropmode=none",
        title: "Hang Gliding",
        src: "https://livesharemedia-usw22.streaming.media.azure.net/2b941807-5fd5-45b6-bdc5-362c3c20ae8f/pexels-cédric-estienne-6749146.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
    {
        id: "6",
        thumbnailImage:
            "https://by3302files.storage.live.com/y4mzi99em6H2SBgawxkOet8pPzlPhQC2L4RWj8-qK3wZBhL_Ybol_8p04L_in28Phl7_D9hOMjl97aEjD93ZB7X18COjmHysfs0bK93goF_FMDBBEJUXAHbmkgvUHFj45VWtEN3n6BSoXZlvZWQXYoDRoGtuBLVMK7wbFUoYxE6ZJR0i8xvycB7bEQ2eJ2iSuVR?width=256&height=136&cropmode=none",
        title: "Dog Days",
        src: "https://livesharemedia-usw22.streaming.media.azure.net/a5a174b6-3ca1-4b33-96fb-ce20b4b3eda1/pexels-zen-chung-5740700.ism/manifest(format=mpd-time-cmaf,encryption=cbc)",
        type: "video",
    },
];

function getInitialMediaId() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    return params.get("mediaId");
}

export function getInitialMediaItem(): MediaItem {
    const mediaId = getInitialMediaId();
    const mediaItem = mediaList.find(
        (mediaItem) => `${mediaItem.id}` === mediaId
    );
    return mediaItem ? mediaItem : mediaList[0];
}
