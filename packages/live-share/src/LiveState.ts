/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { IEvent } from "@fluidframework/common-definitions";
import { ILiveShareEvent, UserMeetingRole } from "./interfaces";
import { cloneValue, TelemetryEvents } from './internals';
import { LiveEventScope } from './LiveEventScope';
import { LiveEventTarget } from './LiveEventTarget';
import { LiveTelemetryLogger } from './LiveTelemetryLogger';
import { LiveEvent } from './LiveEvent';
import { LiveObjectSynchronizer } from './LiveObjectSynchronizer';

/**
 * Events supported by [LiveState` object.
 */
export enum LiveStateEvents {
    /**
     * The objects state has changed.
     */
    stateChanged = 'stateChanged'
}

/**
 * Event typings for `LiveState` class.
 * @template TData Optional data object that's synchronized with the state.
 */
export interface ILiveStateEvents<TData = undefined> extends IEvent {
    /**
     * An `LiveState` objects state has changed.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.state The new state. Can be the same as the previous state.
     * @param listener.data Optional data object for the new state.
     * @param listener.local If true, a local state change occurred.
     */
     (event: 'stateChanged', listener: (state: string, data: TData|undefined, local: boolean) => void): any;
}

/**
 * Live fluid object that synchronizes a named state and optional data value across clients.
 *
 * @remarks
 * The primary benefit of using the `LiveState` object in a Teams meeting, versus something
 * like a `SharedMap`, is that you can restrict the roles of who's allowed to perform state
 * changes.
 * @template TData Optional data object that's synchronized with the state.
 */
export class LiveState<TData = undefined> extends DataObject<{Events: ILiveStateEvents<TData>}> {
    private _logger = new LiveTelemetryLogger(this.runtime);
    private _allowedRoles: UserMeetingRole[] = [];
    private _currentState: IStateChangeEvent<TData> = {name: 'ChangeState', timestamp: 0, state: LiveState.INITIAL_STATE};

    private _scope?: LiveEventScope;
    private _changeStateEvent?: LiveEventTarget<IStateChangeEvent<TData>>;
    private _synchronizer?: LiveObjectSynchronizer<IStateChangeEvent<TData>>;

    /**
     * The objects initial state if not explicitly initialized.
     */
    public static readonly INITIAL_STATE = '';

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
     * Returns true if the object has been started.
     */
    public get isStarted(): boolean {
        return !!this._scope;
    }

    /**
     * Optional data object for the current state.
     */
    public get data(): TData | undefined {
        return cloneValue(this._currentState.data);
    }

    /**
     * The current state.
     */
    public get state(): string {
        return this._currentState.state;
    }

    /**
     * Starts the object.
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     */
    public async initialize(allowedRoles?: UserMeetingRole[], state = LiveState.INITIAL_STATE, data?: TData): Promise<void> {
        if (this._scope) {
            throw new Error(`LiveState already started.`);
        }

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create event scope
        this._scope = new LiveEventScope(this.runtime, allowedRoles);

        // Listen for remote state changes
        this._changeStateEvent = new LiveEventTarget(this._scope, 'ChangeState', (evt, local) => {
            if (!local) {
                // Check for state change
                this.remoteStateReceived(evt, evt.clientId!);
            }
        });

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer(this.id, this.runtime, this.context.containerRuntime, (connecting) => {
                // Return current state
                return this._currentState;
            }, (connecting, state, sender) => {
                // Check for state change
                this.remoteStateReceived(state!, sender);
            });

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
     * Changes to a new state with an optional data object.
     * @param state New state name.
     * @param data Optional. Data object to associate with the new state.
     */
    public changeState(state: string, data?: TData): void {
        if (!this._scope) {
            throw new Error(`LiveState not started.`);
        }

        // Broadcast state change
        const clone = cloneValue(data);
        const evt = this._changeStateEvent!.sendEvent({ state: state, data: clone });

        // Update local state immediately
        // - The _stateUpdatedEvent won't be triggered until the state change is actually sent. If
        //   the client is disconnected this could be several seconds later.
        this.updateState(evt, true);
    }

    private remoteStateReceived(evt: IStateChangeEvent<TData>, sender: string): void {
        LiveEvent.verifyRolesAllowed(sender, this._allowedRoles).then((allowed) => {
            // Ensure that state is allowed, newer, and not the initial state.
            if (allowed && LiveEvent.isNewer(this._currentState, evt) && evt.state !== LiveState.INITIAL_STATE) {
                this.updateState(evt, false);
            }
        }).catch((err) => {
            this._logger.sendErrorEvent(TelemetryEvents.LiveState.RoleVerificationError, err);
        });
    }

    private updateState(evt: IStateChangeEvent<TData>, local: boolean) {
        const oldState = this._currentState.state;
        const newState = evt.state;
        this._currentState = evt;
        this.emit(LiveStateEvents.stateChanged, evt.state, cloneValue(evt.data), local);
        this._logger.sendTelemetryEvent(TelemetryEvents.LiveState.StateChanged, {oldState, newState});
    }
}

interface IStateChangeEvent<T> extends ILiveShareEvent {
    state: string;
    data?: T;
}
