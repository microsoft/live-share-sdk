/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct";
import { DynamicObjectRegistry, LiveEvent, LiveState, LiveStateEvents, UserMeetingRole } from "@microsoft/live-share";
import { TaskManager } from "@fluid-experimental/task-manager";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { Deferred, assert } from "@fluidframework/common-utils";
import { IEvent } from "@fluidframework/common-definitions";
import { v4 as uuid } from "uuid";
import { debounce } from "../internals";

const taskManagerKey = "<<taskManagerKey>>";
const promptStateKey = "<<promptStateKey>>";
const completionStateKey = "<<completionStateKey>>";
const completionTaskKey = "<<completionTaskKey>>";

interface IInternalPromptChangeData {
    promptValue: string;
}
interface IInternalCompletionChangeData {
    completionValue: string;
    promptValue: string;
}

/**
 * Events supported by `LiveCoPilot` object.
 */
export enum LiveCoPilotEvents {
    /**
     * The prompt value has changed.
     */
    promptChanged = "promptChanged",
    /**
     * The completion value has changed.
     * @remarks this event will only emit if the prompt change took place for the current prompt.
     */
    completionChanged = "completionChanged",
    /**
     * Lock granted.
     */
    lockGranted = "lockGranted",
    /**
     * Lock lost.
     */
    lockLost = "lockLost",
}

/**
 * Event typings for `LiveCoPilot` class.
 */
export interface ILiveCoPilotEvents extends IEvent {
    /**
     * An `LiveCoPilot` prompt value has changed.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.promptValue The new prompt value.
     * @param listener.local If true, a local prompt change occurred.
     * @param listener.completionValuePromise Promise for pending completion for the prompt. Will reject if the prompt changes.
     * @param listener.referenceId The reference id of the prompt change, which can be used to correlate the prompt change with the completion changes.
     */
    (
        event: LiveCoPilotEvents.promptChanged,
        listener: (
            promptValue: string,
            local: boolean,
            completionValuePromise: Promise<string>,
            referenceId: string,
        ) => void
    ): any;
    /**
     * An `LiveCoPilot` completion value has changed.
     * @remarks
     * This event will only emit if the prompt change took place for the current prompt.
     * 
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.completionValue The new prompt value.
     * @param listener.local If true, a local prompt change occurred.
     * @param listener.promptValue The value of the prompt used to generate the completion.
     * @param listener.referenceId The reference id of the prompt change, which can be used to correlate the prompt change with the completion changes.
     */
    (
        event: LiveCoPilotEvents.completionChanged,
        listener: (
            completionValue: string,
            local: boolean,
            promptValue: string,
            referenceId: string,
        ) => void
    ): any;
    /**
     * The local user has been granted permission to change completion values.
     * 
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     */
    (
        event: LiveCoPilotEvents.lockGranted,
        listener: () => void
    ): any;
    /**
     * The local user has lost permission to change completion values.
     * 
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     */
    (
        event: LiveCoPilotEvents.lockLost,
        listener: () => void
    ): any;
}

/**
 * Fluid DataObject used in `FluidTurboClient` for the purposes of dynamically loading DDSes.
 * @remarks
 * If a DDS does not yet exist for a given key, a new one is created. Fluid `TaskManager` is used to ensure that only one person is responsible for
 * creating the DDS to prevent data loss. Note that a user must have an active websocket connection to create data objects under this method.
 */
export class LiveCoPilot extends DataObject<{
    Events: ILiveCoPilotEvents;
}> {
    private _taskManager: TaskManager | undefined;
    private _promptLiveState: LiveState<IInternalPromptChangeData> | undefined;
    private _completionLiveState:
        | LiveState<IInternalCompletionChangeData>
        | undefined;
    private _initializing: boolean = false;
    private _lockPrompt: boolean = false;
    private _lockCompletion: boolean = false;
    private _debounceDelayMilliseconds: number = 2500;
    private _autoCompletions: boolean = false;
    private _allowedRoles?: UserMeetingRole[];
    private _onGetCompletion?: (text: string) => Promise<string>;
    private _currentReferenceId: string = "";
    private _deferredCompletionMap: Map<string, Deferred<string>> = new Map();
    private _debounceSendCompletion = debounce(this.handleDebounceSendCompletion.bind(this), this._debounceDelayMilliseconds);

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:LiveCoPilot`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveCoPilot.TypeName,
        LiveCoPilot,
        [TaskManager.getFactory()],
        {},
        new Map([LiveState.factory.registryEntry]),
    );

    /**
     * Returns true if the object has been initialized.
     */
    public get isInitialized(): boolean {
        return !!this._promptLiveState?.isInitialized && !!this._completionLiveState?.isInitialized;
    }

    /**
     * Flag for whether the prompt should be settable only by the user with the prompt lock.
     */
    public get lockPrompt(): boolean {
        return !!this._lockPrompt;
    }
    public set lockPrompt(value: boolean) {
        this._lockPrompt = value;
    }

    /**
     * Flag for whether completions can only be initiated the user with the prompt lock.
     * @remarks
     * Setting to true does not enable automatic completions for users without the prompt lock. Rather, it enables users without the prompt lock to
     * call complete() to trigger the completion of the prompt.
     */
    public get lockCompletion(): boolean {
        return !!this._lockCompletion;
    }
    public set lockCompletion(value: boolean) {
        this._lockCompletion = value;
    }

    /**
     * Flag to enable automatic completions. Debounced by `debounceDelayMilliseconds`.
     */
    public get autoCompletions(): boolean {
        return this._autoCompletions;
    }
    public set autoCompletions(value: boolean) {
        this._autoCompletions = value;
        this.handleDebouncePermissionsChange();
    }

    /**
     * Boolean that indicates whether the selected prompt value meets the validation requirements for sending a completion
     * @remarks
     * If this is false, a user must call the `changePrompt` method to set the prompt value.
     */
    public get haveValidPromptValue(): boolean {
        if (this.promptLiveState.state) {
            return typeof this.promptLiveState.data?.promptValue === "string" && this.promptLiveState.data.promptValue.length > 0;
        }
        return false;
    }

    /**
     * Boolean that indicates whether there is an existing completion value for the current selected prompt.
     */
    public get haveValidCompletionValue(): boolean {
        if (this.promptLiveState.state && this.completionLiveState.state && this.promptLiveState.state === this.completionLiveState.state) {
            return typeof this.completionLiveState.data?.completionValue === "string";
        }
        return false;
    }

    /**
     * Public read-only getter for the current prompt value
     */
    public get promptValue(): string {
        return this.promptLiveState.data?.promptValue || "";
    }

    /**
     * Public read-only getter for the current completion value
     */
    public get completionValue(): string | undefined {
        if (this.haveValidCompletionValue) {
            return this.completionLiveState.data?.completionValue;
        }
        return undefined;
    }

    /**
     * Time in milliseconds to debounce prompt changes. `autoCompletions` must be true for this to take effect.
     */
    public get debounceDelayMilliseconds(): number {
        return this._debounceDelayMilliseconds;
    }
    public set debounceDelayMilliseconds(value: number) {
        this._debounceDelayMilliseconds = value;
    }

    /**
     * Local user has the completion lock.
     */
    public get haveCompletionLock(): boolean {
        return this.taskManager.haveTaskLock(completionTaskKey);
    }

    /**
     * Setter for the onGetCompletion callback.
     */
    public get onGetCompletion(): (promptValue: string) => Promise<string> {
        assert(this._onGetCompletion !== undefined, "onGetCompletion not initialized. Call .initialize() first.");
        return this._onGetCompletion;
    }
    public set onGetCompletion(value: (promptValue: string) => Promise<string>) {
        this._onGetCompletion = value;
    }

    /**
     * Final initialization for the object.
     * 
     * @param onGetCompletion Callback to get AI (e.g., OpenAI) completion text for a given prompt.
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     */
    public async initialize(
        onGetCompletion: (promptValue: string) => Promise<string>,
        allowedRoles?: UserMeetingRole[],
        promptValue?: string,
    ): Promise<void> {
        if (this._initializing) {
            throw new Error(`LiveCoPilot already initializing.`);
        }
        if (this.isInitialized) {
            throw new Error(`LiveCoPilot already initialized.`);
        }
        this._initializing = true;

        // Set on completion callback
        this.onGetCompletion = onGetCompletion;

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        const clientId = await this.waitUntilConnected();
        // Listen for state changes
        this.listenForLiveStateChanges();
        // Initialize the prompt state
        await this.promptLiveState.initialize(allowedRoles, promptValue);
        // Initialize the completion state
        await this.completionLiveState.initialize(allowedRoles);
        // Lock the completion task if we have the necessary roles
        if (await LiveEvent.verifyRolesAllowed(clientId, this._allowedRoles)) {
            this.lockTaskWithSafeDisconnect();
        }
        this._initializing = false;
    }

    /**
     * Changes prompt to a new text value.
     * @remarks
     * If `lockPrompt` is true, only the user with the completion task lock can change the prompt.
     * 
     * @param promptValue The prompt text to complete.
     */
    public changePrompt(promptValue: string): void {
        if (!this.isInitialized) {
            throw new Error(`LiveCoPilot not initialized. Call .initialize() first.`);
        }
        if (this.lockPrompt && !this.haveCompletionLock) {
            throw new Error(`LiveCoPilot prompt is locked.`);
        }
        if (this.promptLiveState.data?.promptValue === promptValue) {
            return;
        }
        this.promptLiveState.changeState(uuid(), {
            promptValue,
        });
    }

    /**
     * Changes completion to a new text value.
     * @remarks
     * If `lockCompletion` is true, only the user with the completion task lock can change the completion.
     * 
     * @param promptValue The prompt text to complete.
     */
    public async sendCompletion(): Promise<{
        completionValue: string;
        referenceId: string;
    }> {
        if (!this.isInitialized) {
            throw new Error(`LiveCoPilot.sendCompletion: not initialized. Call .initialize() first.`);
        }
        if (this.lockCompletion && !this.haveCompletionLock) {
            throw new Error(`LiveCoPilot.sendCompletion: this client does not have the completion lock.`);
        }
        const [, abandonDebounce] = this._debounceSendCompletion;
        abandonDebounce();
        const { referenceId, promptValue, completionValue } = await this.getSendCompletionInfo();
        if (this.lockCompletion && !this.haveCompletionLock) {
            throw new Error(`LiveCoPilot.sendCompletion: the client lost completion lock after receiving the completionValue.`);
        }
        this.completionLiveState.changeState(referenceId, {
            promptValue,
            completionValue,
        });
        return {
            completionValue,
            referenceId,
        };
    }

    private get taskManager() {
        assert(this._taskManager !== undefined, "TaskManager not initialized");
        return this._taskManager;
    }

    private get promptLiveState() {
        assert(this._promptLiveState !== undefined, "promptLiveState not initialized");
        return this._promptLiveState;
    }

    private get completionLiveState() {
        assert(this._completionLiveState !== undefined, "completionLiveState not initialized");
        return this._completionLiveState;
    }

    /**
     * initializingFirstTime is run only once by the first client to create the DataObject.  Here we use it to
     * initialize the state of the DataObject.
     */
    protected async initializingFirstTime() {
        // We create a TaskManager just like any other DDS.
        const taskManager = TaskManager.create(this.runtime, taskManagerKey);
        this.root.set(taskManagerKey, taskManager.handle);
        const promptLiveState = await LiveState.factory.createChildInstance(
            this.context
        );
        this.root.set(promptStateKey, promptLiveState.handle);
        const completionLiveState = await LiveState.factory.createChildInstance(
            this.context
        );
        this.root.set(completionStateKey, completionLiveState.handle);
    }

    /**
     * hasInitialized is run by each client as they load the DataObject.  Here we use it to set up usage of the
     * DataObject, by registering an event listener for dice rolls.
     */
    protected async hasInitialized() {
        const taskManagerHandle =
            this.root.get<IFluidHandle<TaskManager>>(taskManagerKey);
        this._taskManager = await taskManagerHandle?.get();
        const promptStateHandle =
            this.root.get<
                IFluidHandle<LiveState<IInternalPromptChangeData>>
            >(promptStateKey);
        this._promptLiveState = await promptStateHandle?.get();
        const completionStateHandle =
            this.root.get<
                IFluidHandle<LiveState<IInternalCompletionChangeData>>
            >(completionStateKey);
        this._completionLiveState = await completionStateHandle?.get();
        // Listen for task assignments
        this.listenForTaskAssignments();
    }

    /**
     * Listen to changes to the local user's assignment to the completion task. If `autoCompletions` is true, we will start sending completions
     * when the user is assigned the completion task.
     */
    private async listenForTaskAssignments() {
        this.taskManager.on("assigned", async (taskId: string) => {
            if (taskId === completionTaskKey) {
                this.handleDebouncePermissionsChange();
                this.emit(LiveCoPilotEvents.lockGranted);
            }
        });
        this.taskManager.on("lost", async (taskId: string) => {
            if (taskId === completionTaskKey) {
                this.handleDebouncePermissionsChange();
                this.emit(LiveCoPilotEvents.lockLost);
            }
        });
    }

    /**
     * Listen for state changes on the prompt state and completion state.
     */
    private async listenForLiveStateChanges() {
        // Listen for prompt changes
        this.promptLiveState.on(LiveStateEvents.stateChanged, async (referenceId: string, change: IInternalPromptChangeData | undefined, local: boolean) => {
            if (referenceId === "" || typeof change?.promptValue !== "string") return;
            // If the referenceId has changed, reject the previous completion promise (if it exists)
            if (this._currentReferenceId && this._currentReferenceId !== referenceId) {
                const previousDeferredCompletion = this._deferredCompletionMap.get(this._currentReferenceId);
                if (previousDeferredCompletion !== undefined) {
                    previousDeferredCompletion.reject(new Error("Prompt changed before previous completion resolved."));
                    this._deferredCompletionMap.delete(referenceId);
                }
            }
            // Set the current referenceId
            this._currentReferenceId = referenceId;
            // Get or create a deferred promise for the completion
            const existingCompletionDeferred = this._deferredCompletionMap.get(referenceId);
            let completionPromise: Promise<string>;
            if (existingCompletionDeferred) {
                completionPromise = existingCompletionDeferred.promise;
            } else {
                const newDeferred = new Deferred<string>();
                this._deferredCompletionMap.set(referenceId, newDeferred);
                completionPromise = newDeferred.promise;
                // If auto-completions are enabled and user has the completion lock, send a completion after a delay
                if (this.autoCompletions && this.haveCompletionLock) {
                    const [debounceSend] = this._debounceSendCompletion;
                    debounceSend();
                }
            }
            // Emit the promptChanged event
            this.emit(LiveCoPilotEvents.promptChanged, change.promptValue, local, completionPromise, referenceId);
        });
        // Listen for completion changes
        this.completionLiveState.on(LiveStateEvents.stateChanged, async (referenceId: string, change: IInternalCompletionChangeData | undefined, local: boolean) => {
            if (referenceId === "" || typeof change?.promptValue !== "string" || typeof change?.completionValue !== "string") return;
            // Resolve the deferred completion promise if it exists
            const existingCompletionDeferred = this._deferredCompletionMap.get(referenceId);
            if (existingCompletionDeferred) {
                existingCompletionDeferred.resolve(change.completionValue);
                this._deferredCompletionMap.delete(referenceId);
            }
            if (this.promptLiveState.state === referenceId) {
                // Emit the completionChanged event
                this.emit(LiveCoPilotEvents.completionChanged, change.completionValue, local, change.promptValue, referenceId);
            }
        });
    }

    /**
     * Get the send info for `completionLiveState.changeState`.
     * @remarks
     * This method uses the user's provided `onGetCompletion` function to get the completion value. This helper function allows
     * us to handle different permission types for `autoCompletes` and `lockCompletion`, since the permissions can change between
     * when we first run validation and when `onGetCompletion` is resolved.
     */
    private async getSendCompletionInfo(): Promise<{
        referenceId: string;
        promptValue: string;
        completionValue: string;
    }> {
        const referenceId = this.promptLiveState.state;
        const promptValue = this.promptLiveState.data?.promptValue;
        if (!referenceId) {
            throw new Error(`LiveCoPilot.sendCompletion: prompt not set.`);
        }
        if (typeof promptValue !== "string") {
            throw new Error(`LiveCoPilot.sendCompletion: promptValue is not a valid string.`);
        }
        const completionValue = await this.onGetCompletion(promptValue);
        return {
            referenceId,
            promptValue,
            completionValue,
        };
    }

    private async handleDebounceSendCompletion(): Promise<void> {
        if (!this.autoCompletions || !this.haveCompletionLock) return;
        try {
            const { referenceId, promptValue, completionValue } = await this.getSendCompletionInfo();
            if (!this.autoCompletions || !this.haveCompletionLock) return;
            this.completionLiveState.changeState(referenceId, {
                promptValue,
                completionValue,
            });
        } catch (error: any) {
            // TODO: handle error
            console.error(error);
        }
    }

    private handleDebouncePermissionsChange(): void {
        const [debounceSend, abandonDebounceSend] = this._debounceSendCompletion;
        if (!this.autoCompletions || !this.haveCompletionLock) {
            abandonDebounceSend();
        } else if (this.haveValidPromptValue && !this.haveValidPromptValue) {
            debounceSend();
        }
    }

    private waitUntilConnected(): Promise<string> {
        return new Promise((resolve) => {
            const onConnected = (clientId: string) => {
                this.runtime.off("connected", onConnected);
                resolve(clientId);
            };

            if (this.runtime.connected) {
                resolve(this.runtime.clientId as string);
            } else {
                this.runtime.on("connected", onConnected);
            }
        });
    }

    private async lockTaskWithSafeDisconnect() {
        await this.waitUntilConnected();
        try {
            // Join the TaskManager queue to create the DDS
            // TODO: In @fluidframework/task-manager v2, there is a taskManager.subscribeToTask() function so that this doesn't fail on disconnects
            await this.taskManager.lockTask(completionTaskKey);
        } catch {
            this.lockTaskWithSafeDisconnect();
        }
    }
}

// Register LiveCoPilot as a dynamic object
DynamicObjectRegistry.registerObjectClass(LiveCoPilot, LiveCoPilot.TypeName);
