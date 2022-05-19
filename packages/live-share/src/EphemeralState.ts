/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DataObject, DataObjectFactory } from '@fluidframework/aqueduct';
import { IEvent } from "@fluidframework/common-definitions";
import { IEphemeralEvent, UserMeetingRole } from "./interfaces";
import { cloneValue, TelemetryEvents } from './internals';
import { EphemeralEventScope } from './EphemeralEventScope'; 
import { EphemeralEventTarget } from './EphemeralEventTarget';
import { EphemeralTelemetryLogger } from './EphemeralTelemetryLogger';
import { EphemeralEvent } from './EphemeralEvent';
import { EphemeralObjectSynchronizer } from './EphemeralObjectSynchronizer';

/**
 * Events supported by `EphemeralState` object.
 */
export enum EphemeralStateEvents {
    stateChanged = 'stateChanged'
}

/**
 * `EphemeralState` event typings.
 * @template TData Optional data object that's synchronized with the state.
 */
export interface IEphemeralStateEvents<TData = undefined> extends IEvent {
    (event: 'stateChanged', listener: (state: string, data: TData|undefined) => void, local: boolean): any;
}

/**
 * Ephemeral fluid object that synchronizes a named state and optional data value across clients.
 * 
 * @remarks
 * The primary benefit of using the `EphemeralState` object in a Teams meeting, versus something 
 * like a `SharedMap`, is that you can restrict the roles of who's allowed to perform state 
 * changes.
 * @template TData Optional data object that's synchronized with the state.
 */
export class EphemeralState<TData = undefined> extends DataObject<{Events: IEphemeralStateEvents<TData>}> {
    private _logger = new EphemeralTelemetryLogger(this.runtime);
    private _allowedRoles: UserMeetingRole[] = [];
    private _currentState: IStateChangeEvent<TData> = {name: 'ChangeState', timestamp: 0, state: EphemeralState.INITIAL_STATE};

    private _scope?: EphemeralEventScope;
    private _changeStateEvent?: EphemeralEventTarget<IStateChangeEvent<TData>>;
    private _synchronizer?: EphemeralObjectSynchronizer<IStateChangeEvent<TData>>;

    /**
     * The objects initial state if not explicitly initialized.
     */
    public static readonly INITIAL_STATE = '';

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:EphemeralState`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        EphemeralState.TypeName,
        EphemeralState,
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
    public async start(allowedRoles?: UserMeetingRole[], state = EphemeralState.INITIAL_STATE, data?: TData): Promise<void> {
        if (this._scope) {
            throw new Error(`EphemeralState already started.`);
        }

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create event scope
        this._scope = new EphemeralEventScope(this.runtime, allowedRoles);

        // Listen for remote state changes
        this._changeStateEvent = new EphemeralEventTarget(this._scope, 'ChangeState', (evt, local) => {
            if (!local) {
                // Check for state change
                this.remoteStateReceived(evt, evt.clientId!);
            }
        });

        // Create object synchronizer
        this._synchronizer = new EphemeralObjectSynchronizer(this.id, this.context.containerRuntime, (connecting) => {
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
            throw new Error(`EphemeralState not started.`);
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
        EphemeralEvent.verifyRolesAllowed(sender, this._allowedRoles).then((allowed) => {
            // Ensure that state is allowed, newer, and not the initial state.
            if (allowed && EphemeralEvent.isNewer(this._currentState, evt) && evt.state !== EphemeralState.INITIAL_STATE) {
                this.updateState(evt, false);
            }
        }).catch((err) => {
            this._logger.sendErrorEvent(TelemetryEvents.EphemeralState.RoleVerificationError, err);
        });
    }

    private updateState(evt: IStateChangeEvent<TData>, local: boolean) {
        const oldState = this._currentState.state;
        const newState = evt.state;
        this._currentState = evt;
        this.emit(EphemeralStateEvents.stateChanged, evt.state, cloneValue(evt.data), local);
        this._logger.sendTelemetryEvent(TelemetryEvents.EphemeralState.StateChanged, {oldState, newState});
    }
}

interface IStateChangeEvent<T> extends IEphemeralEvent {
    state: string;
    data?: T;
}
