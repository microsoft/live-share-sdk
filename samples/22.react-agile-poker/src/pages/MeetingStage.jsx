/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useMemo, useEffect, useRef } from "react";
import * as microsoftTeams from "@microsoft/teams-js";
import { useTeamsContext } from "../teams-js-hooks/useTeamsContext";
import {
  useSharedObjects,
  useTimer,
  usePokerState,
  usePresence,
  useUserStories,
} from "../teams-fluid-hooks";
import { useStateRef } from "../utils/useStateRef";
import * as UI from "../components";

const MeetingStage = () => {
  const context = useTeamsContext();
  const { pokerState, presence, timer, userStoriesMap, error } =
    useSharedObjects();
  const [answer, answerRef, setAnswer] = useStateRef(null);
  const previousStateRef = useRef();

  // EphemeralState hook for synchronized object storage for game state
  const {
    pokerStateStarted,
    state,
    userStoryId,
    onStartCosting,
    onStartDiscussion,
    onStartWaiting,
  } = usePokerState(pokerState);

  // EphemeralPresence hook for tracking online users
  const {
    presenceStarted,
    users,
    readyUsersCount,
    localUserIsScrumMaster,
    changeReadyStatus,
    reportAnswer,
    onChangeName,
    updatePresence,
  } = usePresence(presence, context?.userObjectId);

  // SharedMap hook for user stories
  const { userStoriesStarted, userStory, assignPoints } = useUserStories(
    userStoriesMap,
    context?.userObjectId,
    userStoryId
  );

  // EphemeralTimer hook for tracking round timer
  const { timerState, timerStarted, beginTimer, pauseTimer } = useTimer(
    timer,
    onStartDiscussion
  );

  // Flag for awaiting container setup
  const loading = useMemo(() => {
    return (
      (!pokerStateStarted ||
        !presenceStarted ||
        !timerStarted ||
        !userStoriesStarted) &&
      !error
    );
  }, [
    error,
    pokerStateStarted,
    presenceStarted,
    timerStarted,
    userStoriesStarted,
  ]);

  // Handle state changes
  useEffect(() => {
    if (!loading && state !== previousStateRef.current) {
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
        beginTimer();
      } else if (state === "discussion") {
        console.log("Starting discussion phase");
        updatePresence({ ready: false, answer: answerRef.current });
        pauseTimer();
      }
      previousStateRef.current = state;
    }
  }, [
    answerRef,
    assignPoints,
    beginTimer,
    changeReadyStatus,
    loading,
    localUserIsScrumMaster,
    pauseTimer,
    previousStateRef,
    reportAnswer,
    updatePresence,
    setAnswer,
    state,
    userStory,
  ]);

  // End round if everyone is ready and local user is scrum master
  useEffect(() => {
    if (state === "costing") {
      if (readyUsersCount === users.length) {
        if (localUserIsScrumMaster) {
          onStartDiscussion();
        }
        reportAnswer(answerRef.current);
      }
    }
  }, [
    answerRef,
    localUserIsScrumMaster,
    onStartDiscussion,
    readyUsersCount,
    reportAnswer,
    state,
    users,
  ]);

  // Effect to stop showing Teams loading spinner
  useEffect(() => {
    if (loading) {
      microsoftTeams.appInitialization.notifySuccess();
    }
  }, [loading]);

  return (
    <UI.GameContainer>
      {/* Display error if failed to join space */}
      {error && <UI.ErrorPane error={error} />}

      {(!state || state === "waiting") && (
        <UI.WaitingRoom
          localUserId={context?.userObjectId}
          onLogIn={onChangeName}
          onStartCosting={onStartCosting}
          users={users}
          userStory={userStory}
        />
      )}

      {state === "costing" && (
        <UI.CostingGame
          answer={answer}
          changeReadyStatus={changeReadyStatus}
          readyUsersCount={readyUsersCount}
          setAnswer={setAnswer}
          timerState={timerState}
          users={users}
          userStory={userStory}
        />
      )}

      {state === "discussion" && (
        <UI.DiscussionRoom
          localUserId={context?.userObjectId}
          onLogIn={onChangeName}
          onStartCosting={onStartCosting}
          onStartWaiting={onStartWaiting}
          users={users}
          userStory={userStory}
        />
      )}
    </UI.GameContainer>
  );
};

export default MeetingStage;
