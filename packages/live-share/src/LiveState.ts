/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory } from "@fluidframework/aqueduct";
import { assert } from "@fluidframework/common-utils";
import { IEvent } from "@fluidframework/common-definitions";
import { ILiveEvent, UserMeetingRole } from "./interfaces";
import { cloneValue, TelemetryEvents } from "./internals";
import { LiveEventScope } from "./LiveEventScope";
import { LiveEventTarget } from "./LiveEventTarget";
import { LiveTelemetryLogger } from "./LiveTelemetryLogger";
import { LiveEvent } from "./LiveEvent";
import { LiveObjectSynchronizer } from "./LiveObjectSynchronizer";
import { LiveShareClient } from "./LiveShareClient";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";
import { LiveDataObject } from "./LiveDataObject";

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
     */
    (
        event: "stateChanged",
        listener: (
            state: TState,
            local: boolean
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
export class LiveState<TState = any> extends LiveDataObject<{
    Events: ILiveStateEvents<TState>;
}> {
    private _logger?: LiveTelemetryLogger;
    private _allowedRoles: UserMeetingRole[] = [];
    private _currentState?: IStateChangeEvent<TState>;

    private _scope?: LiveEventScope;
    private _changeStateEvent?: LiveEventTarget<IStateChangeEvent<TState>>;
    private _synchronizer?: LiveObjectSynchronizer<IStateChangeEvent<TState>>;

    /**
     * The objects initial state if not explicitly initialized.
     */
    public static readonly INITIAL_STATE = undefined;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:LiveState`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveState.TypeName,
        LiveState,
        [],
        {}
    );

    /**
     * Returns true if the object has been initialized.
     */
    public get isInitialized(): boolean {
        return !!this._scope;
    }

    /**
     * @deprecated isInitialized should be used instead
     * Returns true if the object has been initialized.
     */
    public get isStarted(): boolean {
        return this.isInitialized;
    }

    /**
     * The current state.
     */
    public get state(): TState {
        return this.currentState.state;
    }

    /**
     * Starts the object.
     * @param initialState Initial state value
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     */
    public async initialize(
        initialState: TState,
        allowedRoles?: UserMeetingRole[],
    ): Promise<void> {
        if (this._scope) {
            throw new Error(`LiveState already started.`);
        }
        this._logger = new LiveTelemetryLogger(this.runtime, this.liveRuntime)

        // Set initial state
        this.currentState = {
            name: "ChangeState",
            timestamp: 0,
            state: initialState,
        };

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create event scope
        this._scope = new LiveEventScope(this.runtime, this.liveRuntime, allowedRoles);

        // Listen for remote state changes
        this._changeStateEvent = new LiveEventTarget(
            this._scope,
            "ChangeState",
            (evt, local) => {
                if (!local) {
                    // Check for state change
                    this.remoteStateReceived(evt, evt.clientId!);
                }
            }
        );

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer(
            this.id,
            this.runtime,
            this.context.containerRuntime,
            (connecting) => {
                // Return current state
                return this._currentState;
            },
            (connecting, state, sender) => {
                // Check for state change
                this.remoteStateReceived(state!, sender);
            }
        );

        return Promise.resolve();
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
     * @param state New state name.
     */
    public set(state: TState): void {
        if (!this._scope) {
            throw new Error(`LiveState not started.`);
        }

        // Broadcast state change
        const clone = cloneValue(state);
        const evt = this._changeStateEvent!.sendEvent({
            state: clone,
        });

        // Update local state immediately
        // - The _stateUpdatedEvent won't be triggered until the state change is actually sent. If
        //   the client is disconnected this could be several seconds later.
        this.updateState(evt, true);
    }

    /**
     * The current state.
     */
    private get currentState(): IStateChangeEvent<TState> {
        assert(
            this._currentState !== undefined,
            "LiveState is not initialized"
        );
        return this._currentState;
    }

    /**
     * The current state.
     */
    private set currentState(value: IStateChangeEvent<TState>) {
        this._currentState = value;
    }

    private remoteStateReceived(
        evt: IStateChangeEvent<TState>,
        sender: string
    ): void {
        this.liveRuntime.verifyRolesAllowed(sender, this._allowedRoles)
            .then((allowed) => {
                // Ensure that state is allowed, newer, and not the initial state.
                if (
                    allowed &&
                    LiveEvent.isNewer(this.currentState, evt) &&
                    evt.state !== LiveState.INITIAL_STATE
                ) {
                    this.updateState(evt, false);
                }
            })
            .catch((err) => {
                this._logger?.sendErrorEvent(
                    TelemetryEvents.LiveState.RoleVerificationError,
                    err
                );
            });
    }

    private updateState(evt: IStateChangeEvent<TState>, local: boolean) {
        const oldState = this.currentState.state;
        const newState = evt.state;
        this.currentState = evt;
        this.emit(
            LiveStateEvents.stateChanged,
            cloneValue(evt.state),
            local
        );
        this._logger?.sendTelemetryEvent(
            TelemetryEvents.LiveState.StateChanged,
            { oldState, newState }
        );
    }
}

interface IStateChangeEvent<T> extends ILiveEvent {
    state: T;
}

/**
 * Register `LiveState` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LiveState, LiveState.TypeName);
