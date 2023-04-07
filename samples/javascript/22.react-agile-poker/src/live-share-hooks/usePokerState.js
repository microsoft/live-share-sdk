/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useStateRef } from "../utils/useStateRef";

const availableStates = ["waiting", "costing", "discussion"];

export const usePokerState = (pokerState) => {
    const initializeStartedRef = useRef(false);
    const [pokerStateStarted, setStarted] = useState(false);
    const [state, stateRef, setState] = useStateRef();

    const changePokerState = useCallback(
        (state, value) => {
            if (availableStates.includes(state)) {
                pokerState?.changeState(state, value);
            }
        },
        [pokerState]
    );

    const onStartWaiting = useCallback(() => {
        changePokerState("waiting", null);
    }, [changePokerState]);

    const onStartCosting = useCallback(
        (userStory) => {
            console.log("changing to userStory", userStory);
            changePokerState("costing", userStory);
        },
        [changePokerState]
    );

    const onStartDiscussion = useCallback(() => {
        changePokerState("discussion", stateRef.current.value);
    }, [changePokerState, stateRef]);

    useEffect(() => {
        if (!pokerState || pokerState.isInitialized || initializeStartedRef.current) return;
        console.log("usePokerState: initializing poker state");
        initializeStartedRef.current = true;
        pokerState.on("stateChanged", (state, value, local) => {
            if (availableStates.includes(state)) {
                setState({
                    state,
                    value,
                });
            }
        });
        const allowedRoles = ["Organizer"];
        pokerState
            .initialize(allowedRoles)
            .then(() => {
                setStarted(true);
            })
            .catch((error) => console.error(error));
    }, [pokerState, setStarted, setState]);

    return {
        pokerStateStarted,
        state: state?.state,
        userStoryId: state?.value,
        onStartWaiting,
        onStartCosting,
        onStartDiscussion,
    };
};
