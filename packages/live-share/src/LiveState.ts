/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory, createDataObjectKind } from "@fluidframework/aqueduct/internal";
import { assert } from "@fluidframework/core-utils/internal";
import { IEvent } from "@fluidframework/core-interfaces";
import {
    ILiveEvent,
    LiveDataObjectInitializeState,
    UserMeetingRole,
} from "./interfaces";
import { cloneValue, TelemetryEvents } from "./internals";
import {
    LiveDataObjectInitializeNotNeededError,
    LiveDataObjectNotInitializedError,
    UnexpectedError,
} from "./errors";
import { LiveTelemetryLogger } from "./LiveTelemetryLogger";
import { LiveEvent } from "./LiveEvent";
import { LiveObjectSynchronizer } from "./LiveObjectSynchronizer";
import { DynamicObjectRegistry } from "./internals/DynamicObjectRegistry";
import { LiveDataObject } from "./LiveDataObject";
import { SharedObjectKind } from "fluid-framework";

/**
 * Events supported by [LiveState` object.
 */
export enum LiveStateEvents {
    /**
     * The objects state has changed.
     */
    stateChanged = "stateChanged",
}

/**
 * Event typings for `LiveState` class.
 * @template TState State object that's synchronized with the state.
 */
export interface ILiveStateEvents<TState = any> extends IEvent {
    /**
     * An `LiveState` objects state has changed.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.state The new state. Can be the same as the previous state.
     * @param listener.local If true, a local state change occurred.
     * @param listener.clientId clientId of sender.
     * @param listener.timestamp timestamp the time message was sent, according to `LiveShareRuntime.getTimestamp()`
     */
    (
        event: "stateChanged",
        listener: (
            state: TState,
            local: boolean,
            clientId: string,
            timestamp: number
        ) => void
    ): any;
}

/**
 * Live fluid object that synchronizes a named state and optional data value across clients.
 *
 * @remarks
 * The primary benefit of using the `LiveState` object in a Teams meeting, versus something
 * like a `SharedMap`, is that you can restrict the roles of who's allowed to perform state
 * changes.
 * @template TState Optional data object that's synchronized with the state.
 */
export class LiveStateClass<TState = any> extends LiveDataObject<{
    Events: ILiveStateEvents<TState>;
}> {
    private _logger?: LiveTelemetryLogger;
    private _latestEvent?: ILiveEvent<TState>;

    private _synchronizer?: LiveObjectSynchronizer<TState>;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:LiveState`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveStateClass.TypeName,
        LiveStateClass,
        [],
        {}
    );

    /**
     * The current state.
     */
    public get state(): TState {
        return this.latestEvent.data;
    }

    /**
     * Initialize the object to begin sending/receiving state updates through this DDS.
     *
     * @param initialState Initial state value
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     *
     * @returns a void promise that resolves once complete
     *
     * @throws error when `.initialize()` has already been called for this class instance.
     * @throws fatal error when `.initialize()` has already been called for an object of same id but with a different class instance.
     * This is most common when using dynamic objects through Fluid.
     */
    public async initialize(
        initialState: TState,
        allowedRoles?: UserMeetingRole[]
    ): Promise<void> {
        LiveDataObjectInitializeNotNeededError.assert(
            "LiveState:initialize",
            this.initializeState
        );
        // This error should not happen due to prior assertion, but if it is somehow defined at this point, errors will occur.
        UnexpectedError.assert(
            !this._synchronizer,
            "LiveState:initialize",
            "_synchronizer already set, which implies there was an error during initialization that should not occur."
        );
        // Update initialize state as pending
        this.initializeState = LiveDataObjectInitializeState.pending;
        this._logger = new LiveTelemetryLogger(this.runtime, this.liveRuntime);

        // Set initial state
        this.latestEvent = {
            clientId: "", // start as empty because the initial state is not user defined
            name: "ChangeState",
            timestamp: 0,
            data: initialState,
        };

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer<TState>(
            this.id,
            this.runtime,
            this.liveRuntime
        );
        try {
            await this._synchronizer.start(
                initialState,
                async (evt, sender, local) => {
                    // Check for state change.
                    // If it was valid, this will override the local user's previous value.
                    return await this.onReceivedStateEvent(evt, sender, local);
                },
                async (connecting) => {
                    if (connecting) return true;
                    // If user has eligible roles, allow the update to be sent
                    try {
                        return await this.verifyLocalUserRoles();
                    } catch {
                        return false;
                    }
                }
            );
        } catch (error: unknown) {
            // Update initialize state as fatal error
            this.initializeState = LiveDataObjectInitializeState.fatalError;
            throw error;
        }

        // Update initialize state as succeeded
        this.initializeState = LiveDataObjectInitializeState.succeeded;
    }

    /**
     * Disposes of the object when its container is disposed of.
     */
    public dispose(): void {
        super.dispose();
        if (this._synchronizer) {
            this._synchronizer.dispose();
        }
    }

    /**
     * Set a new state value
     *
     * @param state New state value.
     *
     * @returns a void promise that resolves once the set event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles defined through the `allowedRoles` prop in `.initialize()`.
     */
    public async set(state: TState): Promise<void> {
        LiveDataObjectNotInitializedError.assert(
            "LiveState:set",
            "set",
            this.initializeState
        );

        // Broadcast state change
        const clone = cloneValue(state);
        const evt = await this._synchronizer!.sendEvent(clone);

        // Update local state immediately
        // - The _stateUpdatedEvent won't be triggered until the state change is actually sent. If
        //   the client is disconnected this could be several seconds later.
        this.updateState(evt, true);
    }

    /**
     * The current state.
     */
    private get latestEvent(): ILiveEvent<TState> {
        assert(this._latestEvent !== undefined, "LiveState is not initialized");
        return this._latestEvent;
    }

    /**
     * The current state.
     */
    private set latestEvent(value: ILiveEvent<TState>) {
        this._latestEvent = value;
    }

    // Returns true if the remote state was applied successfully
    private async onReceivedStateEvent(
        evt: ILiveEvent<TState>,
        sender: string,
        local: boolean
    ): Promise<boolean> {
        try {
            const allowed = await this.liveRuntime.verifyRolesAllowed(
                sender,
                this._allowedRoles
            );
            // Ensure that state is allowed, newer, and not the initial state.
            if (!allowed || !LiveEvent.isNewer(this.latestEvent, evt))
                return false;
            if (
                JSON.stringify(this.latestEvent.data) ===
                JSON.stringify(evt.data)
            )
                return false;
            this.updateState(evt, local);
            return true;
        } catch (err) {
            this._logger?.sendErrorEvent(
                TelemetryEvents.LiveState.RoleVerificationError,
                err
            );
            return false;
        }
    }

    private updateState(evt: ILiveEvent<TState>, local: boolean) {
        const oldState = this.latestEvent.data;
        const newState = evt.data;
        this.latestEvent = evt;
        this.emit(
            LiveStateEvents.stateChanged,
            cloneValue(evt.data),
            local,
            evt.clientId,
            evt.timestamp
        );
        this._logger?.sendTelemetryEvent(
            TelemetryEvents.LiveState.StateChanged,
            null,
            {
                oldState: JSON.stringify(oldState),
                newState: JSON.stringify(newState),
            }
        );
    }
}

export type LiveState<TState = any> = LiveStateClass<TState>;

// eslint-disable-next-line no-redeclare
export const LiveState = (() => {
    const kind = createDataObjectKind(LiveStateClass);
    return kind as typeof kind & SharedObjectKind<LiveStateClass>
})();

/**
 * Register `LiveState` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LiveState, LiveState.TypeName);
