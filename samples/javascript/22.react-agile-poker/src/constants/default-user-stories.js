let defaultUserStories;
export const getDefaultUserStories = () => {
    if (defaultUserStories) {
        return defaultUserStories;
    }
    const currentTime = 0;
    defaultUserStories = [
        {
            id: "0",
            text: "As a user, I can watch user testing videos together with my team.",
            addedAt: currentTime,
            addedBy: null,
        },
        {
            id: "1",
            text: "As a user, I can play agile poker with my team.",
            addedAt: currentTime,
            addedBy: null,
        },
    ];
    return defaultUserStories;
};
