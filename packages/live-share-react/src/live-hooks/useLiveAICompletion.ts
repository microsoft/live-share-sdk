/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { UserMeetingRole } from "@microsoft/live-share";
import {
    LiveAICompletion,
    LiveAICompletionEvents,
} from "@microsoft/live-share-turbo";
import React from "react";
import { useDynamicDDS } from "../shared-hooks";
import { IUseLiveAICompletionResults } from "../types";


/**
 * React hook for using a Live Share Turbo `LiveAICompletion`. Intended for use with OpenAI's Completion API.
 *
 * @remarks
 * Use this hook to set up an `LiveAICompletion` object, which is used for using AI completions collaboratively at minimal cost.
 *
 * @param uniqueKey the unique key for the `LiveAICompletion`. If one does not yet exist, a new one.
 * @param onGetCompletion React useCallback function that returns a Promise<string> for the latest `promptValue`. Function is intended to
 * communicate with a backend API that uses OpenAI's Completion API.
 * @param allowedRoles Optional. The meeting roles eligible to send events through this object.
 * @param autoCompletions Optional. Stateful boolean that when true, will automatically send completions when the `promptValue` changes. Default value is
 * false.
 * @param debounceDelayMilliseconds Optional. Stateful number that changes the debounce interval when `autoCompletions` is true. Default value is 2500.
 * @param lockPrompt Optional. Stateful boolean that when true, will restrict prompt changes to only the user with `haveCompletionLock` set to true. Default
 * value is false.
 * @param lockCompletion Optional. Stateful boolean that when true, will restrict manual completion changes to only the user with `haveCompletionLock`
 * set to true. This does not impact the `autoCompletions` setting, because `autoCompletions` already has this behavior. Default value is false.
 * 
 * @returns IUseLiveAICompletionResults object that contains stateful responses and callback methods from `LiveAICompletion`.
 */
export const useLiveAICompletion = (
    uniqueKey: string,
    onGetCompletion: (promptValue: string) => Promise<string>,
    allowedRoles?: UserMeetingRole[],
    autoCompletions?: boolean,
    debounceDelayMilliseconds?: number,
    lockPrompt?: boolean,
    lockCompletion?: boolean
): IUseLiveAICompletionResults => {
    /**
     * Reference boolean for whether hook has registered "listening" events for `LiveAICompletion`.
     */
    const listeningRef = React.useRef(false);
    /**
     * @see IUseLiveAICompletionResults["promptValue"]
     */
    const [promptValue, setPromptValue] = React.useState<string>("");
    /**
     * @see IUseLiveAICompletionResults["completionValue"]
     */
    const [completionValue, setCompletionValue] = React.useState<string>();
    /**
     * @see IUseLiveAICompletionResults["haveCompletionLock"]
     */
    const [haveCompletionLock, setHaveCompletionLock] =
        React.useState<boolean>(false);
    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveAICompletion } = useDynamicDDS<LiveAICompletion>(
        uniqueKey,
        LiveAICompletion
    );

    /**
     * @see IUseLiveAICompletionResults["changePrompt"]
     */
    const changePrompt = React.useCallback(
        (value: string) => {
            if (liveAICompletion === undefined) {
                console.error(
                    new Error(
                        "Cannot call emitEvent when liveEvent is undefined"
                    )
                );
                return;
            }
            if (!liveAICompletion.isInitialized) {
                console.error(
                    new Error(
                        "Cannot call emitEvent while liveEvent is not started"
                    )
                );
                return;
            }
            return liveAICompletion.changePrompt(value);
        },
        [liveAICompletion]
    );

    /**
     * @see IUseLiveAICompletionResults["changePrompt"]
     */
    const sendCompletion = React.useCallback(async (): Promise<{
        completionValue: string;
        referenceId: string;
    }> => {
        if (liveAICompletion === undefined) {
            throw new Error("Cannot call sendCompletion while `liveAICompletion` is undefined");
        }
        if (!liveAICompletion.isInitialized) {
            throw new Error(
                "Cannot call sendCompletion while `liveAICompletion` is not initialized"
            );
        }
        return liveAICompletion.sendCompletion();
    }, [liveAICompletion]);

    /**
     * Sets up the `LiveAICompletion` instance.
     */
    React.useEffect(() => {
        if (
            listeningRef.current ||
            liveAICompletion?.isInitialized === undefined
        )
            return;
        listeningRef.current = true;
        // Register event listeners
        const onPromptChanged = async (
            promptValue: string,
            local: boolean,
            completionValuePromise: Promise<string>
        ) => {
            setPromptValue(promptValue);
            if (!liveAICompletion.haveValidCompletionValue) {
                setCompletionValue(undefined);
            }
            try {
                const completionValue = await completionValuePromise;
                setCompletionValue(completionValue);
            } catch {
                // We do nothing, since this typically fails as a result of a new prompt value replacing the old on, permissions changing, etc.
            }
        };
        const onLockGranted = () => {
            setHaveCompletionLock(true);
        };
        const onLockLost = () => {
            setHaveCompletionLock(true);
        };
        liveAICompletion.on(
            LiveAICompletionEvents.promptChanged,
            onPromptChanged
        );
        liveAICompletion.on(LiveAICompletionEvents.lockGranted, onLockGranted);
        liveAICompletion.on(LiveAICompletionEvents.lockLost, onLockLost);
        if (!liveAICompletion.isInitialized) {
            // Initialize the LiveAICompletion instance
            liveAICompletion.initialize(onGetCompletion, allowedRoles);
        }

        return () => {
            // on unmount, remove event listeners
            listeningRef.current = false;
            liveAICompletion?.off(
                LiveAICompletionEvents.promptChanged,
                onPromptChanged
            );
            liveAICompletion?.off(
                LiveAICompletionEvents.lockGranted,
                onLockGranted
            );
            liveAICompletion?.off(LiveAICompletionEvents.lockLost, onLockLost);
        };
    }, [liveAICompletion]);

    /**
     * Sets the onGetCompletion of the `liveAICompletion` based on the 'onGetCompletion' prop
     */
    React.useEffect(() => {
        if (
            liveAICompletion?.isInitialized === true &&
            onGetCompletion !== undefined
        ) {
            liveAICompletion.onGetCompletion = onGetCompletion;
        }
    }, [liveAICompletion?.isInitialized, onGetCompletion]);

    /**
     * Sets the autoCompletions of the `liveAICompletion` based on the 'autoCompletions' prop
     */
    React.useEffect(() => {
        if (
            liveAICompletion !== undefined &&
            autoCompletions !== undefined &&
            liveAICompletion.autoCompletions !== autoCompletions
        ) {
            liveAICompletion.autoCompletions = autoCompletions;
        }
    }, [liveAICompletion?.autoCompletions, autoCompletions]);

    /**
     * Sets the debounceDelayMilliseconds of the `liveAICompletion` based on the 'debounceDelayMilliseconds' prop
     */
    React.useEffect(() => {
        if (
            liveAICompletion !== undefined &&
            debounceDelayMilliseconds !== undefined &&
            liveAICompletion.debounceDelayMilliseconds !== debounceDelayMilliseconds
        ) {
            liveAICompletion.debounceDelayMilliseconds = debounceDelayMilliseconds;
        }
    }, [liveAICompletion, debounceDelayMilliseconds]);

    /**
     * Sets the lockPrompt of the `liveAICompletion` based on the 'lockPrompt' prop
     */
    React.useEffect(() => {
        if (
            liveAICompletion !== undefined &&
            lockPrompt !== undefined &&
            liveAICompletion.lockPrompt !== lockPrompt
        ) {
            liveAICompletion.lockPrompt = lockPrompt;
        }
    }, [liveAICompletion?.lockPrompt, lockPrompt]);

    /**
     * Sets the lockCompletion of the `liveAICompletion` based on the 'lockCompletion' prop
     */
    React.useEffect(() => {
        if (
            liveAICompletion !== undefined &&
            lockCompletion !== undefined &&
            liveAICompletion.lockCompletion !== lockCompletion
        ) {
            liveAICompletion.lockCompletion = lockCompletion;
        }
    }, [liveAICompletion?.lockCompletion, lockCompletion]);

    return {
        changePrompt,
        completionValue,
        haveCompletionLock,
        liveAICompletion,
        promptValue,
        sendCompletion,
    };
};
