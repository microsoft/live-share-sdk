/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useMemo, useEffect, useRef } from "react";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
import {
    useSharedObjects,
    useTimer,
    usePokerState,
    usePresence,
    useUserStories,
} from "../live-share-hooks";
import { useStateRef } from "../utils/useStateRef";
import * as UI from "../components";
import { LiveSharePage } from "../components/LiveSharePage";

const MeetingStage = () => {
    const context = useTeamsContext();
    const {
        container,
        pokerState,
        presence,
        timer,
        userStoriesMap,
        error,
        timestampProvider,
    } = useSharedObjects();
    const [answer, answerRef, setAnswer] = useStateRef(null);
    const previousStateRef = useRef();

    // LiveState hook for synchronized object storage for game state
    const {
        pokerStateStarted,
        state,
        userStoryId,
        onStartCosting,
        onStartDiscussion,
        onStartWaiting,
    } = usePokerState(pokerState);

    // LivePresence hook for tracking online users
    const {
        presenceStarted,
        users,
        readyUsersCount,
        localUserIsScrumMaster,
        changeReadyStatus,
        reportAnswer,
        updatePresence,
    } = usePresence(presence, context);

    // SharedMap hook for user stories
    const { userStoriesStarted, userStory, assignPoints } = useUserStories(
        userStoriesMap,
        context?.user?.id,
        userStoryId,
        timestampProvider
    );

    // LiveTimer hook for tracking round timer
    const { timerMilliRemaining, timerStarted, beginTimer, pauseTimer } =
        useTimer(timer, onStartDiscussion);

    // Flag for awaiting container setup
    const started = useMemo(() => {
        return [
            pokerStateStarted,
            presenceStarted,
            timerStarted,
            userStoriesStarted,
        ].every((value) => value === true);
    }, [pokerStateStarted, presenceStarted, timerStarted, userStoriesStarted]);

    // Handle state changes
    useEffect(() => {
        if (started && state !== previousStateRef.current) {
            if (state === "waiting") {
                if (
                    previousStateRef.current === "discussion" &&
                    localUserIsScrumMaster
                ) {
                    assignPoints(answerRef.current);
                }
                console.log("Starting waiting phase");
                setAnswer(null);
                reportAnswer(null);
            } else if (state === "costing") {
                console.log("Starting costing phase");
            } else if (state === "discussion") {
                console.log("Starting discussion phase");
                updatePresence({ ready: false, answer: answerRef.current });
                pauseTimer();
            }
            previousStateRef.current = state;
        }
    }, [
        answerRef,
        started,
        localUserIsScrumMaster,
        previousStateRef,
        setAnswer,
        state,
        userStory,
        assignPoints,
        beginTimer,
        changeReadyStatus,
        pauseTimer,
        reportAnswer,
        updatePresence,
    ]);

    // End round if everyone is ready and local user is scrum master
    useEffect(() => {
        if (state === "costing") {
            if (readyUsersCount === users.length && users.length > 0) {
                if (localUserIsScrumMaster) {
                    onStartDiscussion();
                }
                reportAnswer(answerRef.current);
            }
        }
    }, [
        answerRef,
        localUserIsScrumMaster,
        readyUsersCount,
        state,
        users,
        reportAnswer,
        onStartDiscussion,
    ]);

    return (
        <LiveSharePage
            context={context}
            container={container}
            started={started}
        >
            <UI.GameContainer>
                {/* Display error if failed to join space */}
                {error && <UI.ErrorPane error={error} />}

                {state === "waiting" && (
                    <UI.WaitingRoom
                        localUserId={context?.user?.id}
                        users={users}
                        userStory={userStory}
                        onStartCosting={() => {
                            beginTimer();
                            const url = new URL(window.location);
                            onStartCosting(
                                url.searchParams.get("userStoryId") || "0"
                            );
                        }}
                    />
                )}

                {state === "costing" && (
                    <UI.CostingGame
                        answer={answer}
                        readyUsersCount={readyUsersCount}
                        setAnswer={setAnswer}
                        timerMilliRemaining={timerMilliRemaining}
                        users={users}
                        userStory={userStory}
                        changeReadyStatus={changeReadyStatus}
                    />
                )}

                {state === "discussion" && (
                    <UI.DiscussionRoom
                        localUserId={context?.user?.id}
                        users={users}
                        userStory={userStory}
                        onStartCosting={() => {
                            beginTimer();
                            const url = new URL(window.location);
                            onStartCosting(
                                url.searchParams.get("userStoryId") || "0"
                            );
                        }}
                        onStartWaiting={onStartWaiting}
                    />
                )}
            </UI.GameContainer>
        </LiveSharePage>
    );
};

export default MeetingStage;
