/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useStateRef } from "../utils/useStateRef";
import { LiveState } from "@microsoft/live-share";

const AVAILABLE_STATES = ["waiting", "costing", "discussion"];
const INITIAL_STATE = {
    state: "waiting",
    value: null,
};

/**
 * 
 * @param {LiveState<object>} pokerState LiveState object
 * @returns pokerStateStarted, state, userStoryId, onStartWaiting, onStartCosting, onStartDiscussion
 */
export const usePokerState = (pokerState) => {
    const initializeStartedRef = useRef(false);
    const [pokerStateStarted, setStarted] = useState(false);
    const [state, stateRef, setState] = useStateRef(INITIAL_STATE);

    const changePokerState = useCallback(
        (newState, newValue) => {
            if (!pokerState) return;
            if (!AVAILABLE_STATES.includes(newState)) return;
            console.log("usePokerState: changing state to", newState, newValue);
            pokerState.set({
                state: newState,
                value: newValue,
            });
        },
        [pokerState]
    );

    const onStartWaiting = useCallback(() => {
        changePokerState("waiting", null);
    }, [changePokerState]);

    const onStartCosting = useCallback(
        (userStory) => {
            console.log("usePokerState: changing to userStory", userStory);
            changePokerState("costing", userStory);
        },
        [changePokerState]
    );

    const onStartDiscussion = useCallback(() => {
        changePokerState("discussion", stateRef.current.value);
    }, [changePokerState, stateRef]);

    useEffect(() => {
        if (
            !pokerState ||
            pokerState.isInitialized ||
            initializeStartedRef.current
        )
            return;
        console.log("usePokerState: initializing poker state");
        initializeStartedRef.current = true;
        pokerState.on("stateChanged", (state) => {
            if (state.state === stateRef.current.state) return;
            if (!AVAILABLE_STATES.includes(state.state)) return;
            setState({
                state: state.state,
                value: state.value,
            });
        });
        const allowedRoles = ["Organizer"];
        pokerState
            .initialize(INITIAL_STATE, allowedRoles)
            .then(() => {
                setStarted(true);
            })
            .catch((error) => console.error(error));
    }, [pokerState]);

    return {
        pokerStateStarted,
        state: state?.state,
        userStoryId: state?.value,
        onStartWaiting,
        onStartCosting,
        onStartDiscussion,
    };
};
