/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IRuntimeSignaler } from "./LiveEventScope";
import { LiveShareRuntime } from "./LiveShareRuntime";
import {
    GetLocalUserCanSend,
    ILiveEvent,
    UpdateSynchronizationState,
} from "./interfaces";

/**
 * Synchronizes the underlying state of an live object with all of the other instances of
 * the object connected to the same container.
 *
 * @remarks
 * When a synchronizer for a live object is first created it will broadcast a `"connect"`
 * message, containing the objects initial state, to all other instances of the object that are
 * currently running on other clients. Those instances will respond to the sent "connect" message
 * by broadcasting an `"update"` message containing the current state of their object.
 *
 * Anytime a remote "connect" or "update" event is received, the synchronizer will call the passed
 * in `updateState` callback with the remote objects state and the senders clientId for role
 * verification purposes. The logic for processing these state updates will vary but implementations
 * will generally want to include a timestamp in their state update so that clients can protect
 * against out-of-order and delayed updates. Deriving your state update from `ILiveEvent` and
 * using `LiveEvent.isNewer` to compare the received update with the current update makes this
 * simple.
 *
 * Once the initial "connect" event is sent, the synchronizer will periodically broadcast additional
 * "update" events containing the live objects current state. This redundancy helps to guard
 * against missed events and can be used as a ping for scenarios like presence where users can
 * disconnect from the container without notice.  The rate at which these ping events are sent can be
 * adjusted globally for a container by setting the `LiveObjectSynchronizerRegistry.updateInterval` property
 * through `LiveShareRuntime`.
 *
 * While each new synchronizer instance will result in a separate "connect" message being sent, the
 * periodic updates that are sent get batched together into a single "update" message. This lets apps
 * add as many live objects to a container as they'd like without increasing the number of
 * messages being broadcast to the container.
 *
 * Only a single synchronizer is allowed per live object. Attempting to create more than one
 * synchronizer for the same live object will result in an exception being raised.
 * @template TState Type of state object being synchronized. This object should be a simple JSON object that uses only serializable primitives.
 */
export class LiveObjectSynchronizer<TState> {
    private _isDisposed = false;

    /**
     * Creates a new `LiveObjectSynchronizer` instance.
     *
     * @remarks
     * Consumers should subscribe to the synchronizers `"received"` event to process the remote
     * state updates being sent by other instances of the live object.
     * @param id ID of the live object being synchronized. This should be the value of `this.id` in a class that derives from `LiveDataObject`.
     ^ @param runtime The objects local runtime. This should be the value of `this.runtime`.
     * @param liveRuntime The runtime for the Live Share session. This should be the value of `this.liveRuntime` in a class derived from `LiveDataObject`.
     */
    constructor(
        private readonly id: string,
        private readonly runtime: IRuntimeSignaler,
        private readonly liveRuntime: LiveShareRuntime
    ) {}

    /**
     * Starts a `LiveObjectSynchronizer` instance.
     *
     * @remarks
     * Consumers should subscribe to the synchronizers `"received"` event to process the remote
     * state updates being sent by other instances of the live object.
     * @param initialState The initial state for the local user. Does not impact remote state that has been set since connecting to the session.
     * @param updateState A function called to process a state update received from a remote instance. This will be called anytime a "connect" or "update" message is received.
     * @param getLocalUserCanSend A async function called to determine whether the local user can send a connect/update message. Return true if the user can send the update.
     * @param shouldUpdateTimestampPeriodically flag for updating the timestamp whenever sending out a periodic update
     */
    public start(
        initialState: TState,
        updateState: UpdateSynchronizationState<TState>,
        getLocalUserCanSend: GetLocalUserCanSend,
        shouldUpdateTimestampPeriodically = false
    ): Promise<void> {
        return this.liveRuntime.objectManager.registerObject<TState>(
            this.id,
            this.runtime,
            initialState,
            {
                updateState,
                getLocalUserCanSend,
                shouldUpdateTimestampPeriodically,
            }
        );
    }

    /**
     * Disposes of the synchronizer.
     *
     * @remarks
     * All synchronization for the container will stop once the last instance has been disposed of.
     */
    public dispose(): void {
        if (!this._isDisposed) {
            this._isDisposed = true;
            this.liveRuntime.objectManager.unregisterObject(this.id);
        }
    }

    /**
     * Gets the most recent event sent for the synchronizer.
     * @param objectId the `LiveDataObject` id
     * @returns the latest event sent, or undefined if there is none
     */
    public getLatestEvent(): ILiveEvent<TState> | undefined {
        return this.liveRuntime.objectManager.getLatestEventForObject<TState>(
            this.id
        );
    }

    /**
     * Gets the most recent event sent for the synchronizer for a given clientId
     * @param clientId the client to get the value for
     * @returns the latest event sent, or undefined if there is none
     */
    public getLatestEventForClient(
        clientId: string
    ): ILiveEvent<TState> | undefined {
        return this.liveRuntime.objectManager.getLatestEventForObjectClient<TState>(
            this.id,
            clientId
        );
    }

    /**
     * Gets the most recent events sent for the synchronizer.
     * @returns the latest events sent, or undefined if there are none
     */
    public getEvents(): ILiveEvent<TState>[] | undefined {
        return this.liveRuntime.objectManager.getEventsForObject<TState>(
            this.id
        );
    }

    /**
     * Sends a one-time event through the synchronizer
     * @param data the date for the event to send
     * @returns the event that was sent
     */
    public sendEvent<TState = any>(data: TState): Promise<ILiveEvent<TState>> {
        return this.liveRuntime.objectManager.sendEventForObject(this.id, data);
    }
}
