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
 * @internal
 * @hidden
 *
 * Synchronizes the underlying state of an live object with all of the other instances of the object connected to the same container.
 *
 * @remarks
 * When a user first connects to a Live Share session, a "connect" message will be sent out to other users via `LiveObjectManager`.
 * Each other client will then broadcast out their latest values for each `LiveObjectSynchronizer` instance they listen to.
 * These responses get cached internally, while waiting for a `LiveObjectSynchronizer` instance to register to receive & listen to them. `LiveObjectManger`
 * will continue listening for ongoing changes made as well, even if the user has not yet registered the corresponding `LiveObjectSynchronizer` id.
 *
 * As mentioned, "connect" events are sent when the user first connects to a container, and not when first registering the object. This is because this ping-ping
 * algorithm is an N^2 burden on our servers, due to connect events leading to every client in the session broadcasting an event in response. Doing it once
 * up front allows us to limit this to a single N^2 message per connection, limiting the burden for larger meeting sizes.
 *
 * Anytime a remote "connect" or "update" event is received, the synchronizer will call the passed in `updateState` callback with the
 * remote objects state and the senders clientId for role verification purposes. It is up to the user of `LiveObjectSynchronizer` to decide
 * whether that event is valid or not. `updateState` is also expecting a boolean to be returned, which determines whether that state should
 * be applied locally for the user as well. For `LivePresence` for example, we never want another user's state to override their own.
 * For `LiveState` and `LiveTimer`, we always want valid events to overwrite that tracked by the local user, since the user that initiated
 * the change could leave the session at any point.
 *
 * To ensure that potential conflicts or dropped socket events get resolved, background updates are sent periodically. This update includes
 * all of the local client's most recent state for each `LiveObjectSynchronizer` they have registered. These messages get sent automatically.
 * The rate at which these ping events are sent can be adjusted for a container by setting `this.liveRuntime.objectManager.updateInterval` property
 * through your `LiveDataObject` instance.
 *
 * Updates sent in the background are by default sent using the timestamp from when the state was last updated for that client. To change this behavior,
 * set the `shouldUpdateTimestampPeriodically` in `.start()` to make those timestamps update automatically before sending "update" messages.
 *
 * `LiveObjectSynchronizer` also exposes an `sendEvent` API, which will take an object matching `TState` and broadcast that out to other clients. Both this
 * API and the background updates both validate the validity of an outgoing message using `getLocalUserCanSend`, which is an asynchronous callback
 * that allows `LiveDataObject` instances to proactively determine when it is appropriate to send a message (e.g., has required roles). While these
 * messages should also be validated on the receiving end, this can help prevent sending an excess of messages that we already know are going to fail,
 * reducing load & cost of the service.
 *
 * Only a single synchronizer is allowed per live object. Attempting to create more than one synchronizer for the same live object will result in an exception
 * being raised.
 *
 * @template TState Type of state object being synchronized. This object should be a simple JSON object that uses only serializable primitives.
 */
export class LiveObjectSynchronizer<TState> {
    private _isDisposed = false;

    /**
     * Creates a new `LiveObjectSynchronizer` instance.
     *
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
     */
    public dispose(): void {
        if (!this._isDisposed) {
            this._isDisposed = true;
            this.liveRuntime.objectManager.unregisterObject(this.id);
        }
    }

    /**
     * Gets the most recent event sent for the synchronizer.
     * @remarks
     * This does not determine the validity of a message. For a sorted list of events sent by all clients,
     * use the `getEvents` API. You can then loop through that list and validate each message until you find
     * the most valid API.
     *
     * @param objectId the `LiveDataObject` id
     * @returns the latest event sent, or undefined if there is none.
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

    /**
     * @hidden
     * Sends a throttled one-time event for the purposes of consolidating multiple signals into a single one.
     * @param data the date for the event to send
     * @returns the event that was sent
     */
    public sendThrottledEvent<TState = any>(
        data: TState
    ): Promise<ILiveEvent<TState>> {
        return this.liveRuntime.objectManager.sendThrottledEventForObject(
            this.id,
            data
        );
    }
}
