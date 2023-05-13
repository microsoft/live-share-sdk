/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuid } from "uuid";
import { getDefaultUserStories } from "../constants/default-user-stories";

export const useUserStories = (
    userStoriesMap,
    localUserId,
    userStoryId,
    timestampProvider
) => {
    const [userStories, setUserStories] = useState([]);
    const [userStoriesStarted, setStarted] = useState(false);
    const initialUserStoryIdRef = useRef(getInitialUserStoryId());

    const userStory = useMemo(() => {
        let id = userStoryId ?? initialUserStoryIdRef.current;
        return userStories.find((story) => story.id === id);
    }, [userStoryId, userStories]);

    const addUserStory = useCallback(
        (userStoryText) => {
            const id = uuid();
            userStoriesMap?.set(id, {
                text: userStoryText,
                addedAt: timestampProvider.getTimestamp(),
                addedBy: localUserId,
            });
        },
        [userStoriesMap, localUserId, timestampProvider]
    );

    const assignPoints = useCallback(
        (points) => {
            const updatedStory = userStories.find(
                (story) => story.id === userStory.id
            );
            if (userStory) {
                userStoriesMap?.set(userStory.id, {
                    text: updatedStory.text,
                    addedAt: updatedStory.addedAt,
                    addedBy: updatedStory.addedBy,
                    points,
                });
            }
        },
        [userStoriesMap, userStory, userStories]
    );

    const refreshUserStories = useCallback(() => {
        const values = [];
        userStoriesMap.forEach((value, key) =>
            values.push({
                id: key,
                ...value,
            })
        );
        values.sort((a, b) => b.addedAt - a.addedAt);
        setUserStories(values);
    }, [userStoriesMap, setUserStories]);

    useEffect(() => {
        if (!userStoriesMap || userStoriesStarted) return;
        console.info("useUserStories: initializing user stories");
        setStarted(true);
        userStoriesMap.on("valueChanged", refreshUserStories);
        refreshUserStories();
    }, [
        userStoriesMap,
        userStoriesStarted,
        setUserStories,
        setStarted,
        refreshUserStories,
    ]);

    return {
        userStoriesStarted,
        userStories,
        userStory,
        addUserStory,
        assignPoints,
    };
};

export function getInitialUserStoryId() {
    const url = window.location.href.includes("/#/")
        ? new URL(`${window.location.href.split("/#/").join("/")}`)
        : new URL(window.location.href);
    // If params doesn't have a user story, use the first one in our default list
    return url.searchParams.get("userStoryId") ?? getDefaultUserStories()[0].id;
}
