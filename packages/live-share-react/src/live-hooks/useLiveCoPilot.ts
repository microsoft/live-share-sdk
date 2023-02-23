/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { UserMeetingRole } from "@microsoft/live-share";
import { LiveCoPilot, LiveCoPilotEvents } from "@microsoft/live-share-turbo";
import React from "react";
import { useDynamicDDS } from "../shared-hooks";
import { IUseLiveCoPilotResults } from "../types";

/**
 * React hook for using a Live Share Turbo `LiveCoPilot`. Intended for use with OpenAI's Completion API.
 *
 * @remarks
 * Use this hook to set up an `LiveCoPilot` object, which is used for using AI completions collaboratively at minimal cost.
 *
 * @param uniqueKey the unique key for the `LiveCoPilot`. If one does not yet exist, a new one.
 * @param onGetCompletion React useCallback function that returns a Promise<string> for the latest `promptValue`. Function is intended to
 * communicate with a backend API that uses OpenAI's Completion API.
 * @param allowedRoles Optional. The meeting roles eligible to send events through this object.
 * @param defaultPromptValue Optional. Text that sets the default prompt value. Default value is an empty string.
 * @param autoCompletions Optional. Stateful boolean that when true, will automatically send completions when the `promptValue` changes. Default value is true.
 * @param debounceDelayMilliseconds Optional. Stateful number that changes the debounce interval when `autoCompletions` is true. Default value is 1000.
 * @param lockPrompt Optional. Stateful boolean that when true, will restrict prompt changes to only the user with `haveCompletionLock` set to true. Default
 * value is false.
 * @param lockCompletion Optional. Stateful boolean that when true, will restrict manual completion changes to only the user with `haveCompletionLock`
 * set to true. This does not impact the `autoCompletions` setting, because `autoCompletions` already has this behavior. Default value is false.
 *
 * @returns IUseLiveCoPilotResults object that contains stateful responses and callback methods from `LiveCoPilot`.
 */
export const useLiveCoPilot = (
    uniqueKey: string,
    onGetCompletion: (promptValue: string) => Promise<string>,
    allowedRoles?: UserMeetingRole[],
    defaultPromptValue?: string,
    autoCompletions?: boolean,
    debounceDelayMilliseconds?: number,
    lockPrompt?: boolean,
    lockCompletion?: boolean
): IUseLiveCoPilotResults => {
    /**
     * @see IUseLiveCoPilotResults["promptValue"]
     */
    const [promptValue, setPromptValue] = React.useState<string>("");
    /**
     * @see IUseLiveCoPilotResults["completionValue"]
     */
    const [completionValue, setCompletionValue] = React.useState<string>();
    /**
     * @see IUseLiveCoPilotResults["haveCompletionLock"]
     */
    const [haveCompletionLock, setHaveCompletionLock] =
        React.useState<boolean>(false);
    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveCoPilot } = useDynamicDDS<LiveCoPilot>(
        uniqueKey,
        LiveCoPilot
    );

    /**
     * @see IUseLiveCoPilotResults["changePrompt"]
     */
    const changePrompt = React.useCallback(
        (value: string) => {
            if (liveCoPilot === undefined) {
                console.error(
                    new Error(
                        "Cannot call emitEvent when liveEvent is undefined"
                    )
                );
                return;
            }
            if (!liveCoPilot.isInitialized) {
                console.error(
                    new Error(
                        "Cannot call emitEvent while liveEvent is not started"
                    )
                );
                return;
            }
            return liveCoPilot.changePrompt(value);
        },
        [liveCoPilot]
    );

    /**
     * @see IUseLiveCoPilotResults["changePrompt"]
     */
    const sendCompletion = React.useCallback(async (): Promise<{
        completionValue: string;
        referenceId: string;
    }> => {
        if (liveCoPilot === undefined) {
            throw new Error(
                "Cannot call sendCompletion while `liveCoPilot` is undefined"
            );
        }
        if (!liveCoPilot.isInitialized) {
            throw new Error(
                "Cannot call sendCompletion while `liveCoPilot` is not initialized"
            );
        }
        return liveCoPilot.sendCompletion();
    }, [liveCoPilot]);

    /**
     * Sets up the `LiveCoPilot` instance.
     */
    React.useEffect(() => {
        if (liveCoPilot === undefined) return;
        // Register event listeners
        const onPromptChanged = async (
            promptValue: string,
            local: boolean,
            completionValuePromise: Promise<string>
        ) => {
            setPromptValue(promptValue);
            if (!liveCoPilot.haveValidCompletionValue) {
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
        liveCoPilot.on(LiveCoPilotEvents.promptChanged, onPromptChanged);
        liveCoPilot.on(LiveCoPilotEvents.lockGranted, onLockGranted);
        liveCoPilot.on(LiveCoPilotEvents.lockLost, onLockLost);
        if (!liveCoPilot.isInitialized) {
            // Initialize the LiveCoPilot instance
            liveCoPilot.initialize(
                onGetCompletion,
                allowedRoles,
                defaultPromptValue
            );
        }

        return () => {
            // on unmount, remove event listeners
            liveCoPilot?.off(LiveCoPilotEvents.promptChanged, onPromptChanged);
            liveCoPilot?.off(LiveCoPilotEvents.lockGranted, onLockGranted);
            liveCoPilot?.off(LiveCoPilotEvents.lockLost, onLockLost);
        };
    }, [liveCoPilot]);

    /**
     * Sets the onGetCompletion of the `liveCoPilot` based on the 'onGetCompletion' prop
     */
    React.useEffect(() => {
        if (
            liveCoPilot?.isInitialized === true &&
            onGetCompletion !== undefined
        ) {
            liveCoPilot.onGetCompletion = onGetCompletion;
        }
    }, [liveCoPilot?.isInitialized, onGetCompletion]);

    /**
     * Sets the autoCompletions of the `liveCoPilot` based on the 'autoCompletions' prop
     */
    React.useEffect(() => {
        if (
            liveCoPilot !== undefined &&
            autoCompletions !== undefined &&
            liveCoPilot.autoCompletions !== autoCompletions
        ) {
            liveCoPilot.autoCompletions = autoCompletions;
        }
    }, [liveCoPilot?.autoCompletions, autoCompletions]);

    /**
     * Sets the debounceDelayMilliseconds of the `liveCoPilot` based on the 'debounceDelayMilliseconds' prop
     */
    React.useEffect(() => {
        if (
            liveCoPilot !== undefined &&
            debounceDelayMilliseconds !== undefined &&
            liveCoPilot.debounceDelayMilliseconds !== debounceDelayMilliseconds
        ) {
            liveCoPilot.debounceDelayMilliseconds = debounceDelayMilliseconds;
        }
    }, [liveCoPilot, debounceDelayMilliseconds]);

    /**
     * Sets the lockPrompt of the `liveCoPilot` based on the 'lockPrompt' prop
     */
    React.useEffect(() => {
        if (
            liveCoPilot !== undefined &&
            lockPrompt !== undefined &&
            liveCoPilot.lockPrompt !== lockPrompt
        ) {
            liveCoPilot.lockPrompt = lockPrompt;
        }
    }, [liveCoPilot?.lockPrompt, lockPrompt]);

    /**
     * Sets the lockCompletion of the `liveCoPilot` based on the 'lockCompletion' prop
     */
    React.useEffect(() => {
        if (
            liveCoPilot !== undefined &&
            lockCompletion !== undefined &&
            liveCoPilot.lockCompletion !== lockCompletion
        ) {
            liveCoPilot.lockCompletion = lockCompletion;
        }
    }, [liveCoPilot?.lockCompletion, lockCompletion]);

    return {
        changePrompt,
        completionValue,
        haveCompletionLock,
        liveCoPilot,
        promptValue,
        sendCompletion,
    };
};
