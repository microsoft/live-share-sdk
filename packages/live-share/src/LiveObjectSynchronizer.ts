/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IInboundSignalMessage } from "@fluidframework/runtime-definitions";
import { TypedEventEmitter } from "@fluidframework/common-utils";
import { IRuntimeSignaler } from "./LiveEventScope";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { IContainerRuntimeSignaler, ILiveEvent, UserMeetingRole } from "./interfaces";
import { IEvent } from "@fluidframework/common-definitions";
import { LiveEvent } from "./LiveEvent";
import { cloneValue, isILiveEvent, waitUntilConnected } from "./internals";
import { AzureMember, IAzureAudience } from "@fluidframework/azure-client";

/**
 * Callback function used to the get the current state of an live object that's being
 * synchronized.
 * @template TState Type of state object being synchronized.
 * @param connecting If true a "connect" message is being sent and the initial connecting state of the object is being requested.
 * @returns The objects current state or undefined if not known or available.
 */
export type GetSynchronizationState<TState> = (
    connecting: boolean
) => TState | undefined;

/**
 * Callback function used to the receive the state update sent by a remote live object.
 * @template TState Type of state object being synchronized.
 * @param connecting If true a "connect" message was received and `state` represents the remote objects initial state.
 * @param state The remote object initial or current state.
 * @param senderId The clientId of the sender provider for role verification purposes.
 */
export type UpdateSynchronizationState<TState> = (
    connecting: boolean,
    state: ILiveEvent<TState>,
    senderId: string
) => void;

/**
 * Callback function used to validate whether or not the local user can send an update for this object.
 *
 * @template TState Type of state object being synchronized.
 * @param connecting If true, the message type we are validating is to send the local user's "connect" message.
 * @returns return true if the local user can send this update, or false if not.
 */
export type GetLocalUserCanSend = (connecting: boolean) => Promise<boolean>;

type ILiveClientEventMap<TState = any> = Map<string, ILiveEvent<TState>>;
type ILiveObjectStore = Map<string, ILiveClientEventMap>;

/**
 * Manager of all of the `LiveObjectSynchronizer` objects
 *
 * @remarks
 * This is intended for use through `LiveShareRuntime`.
 */
export class LiveObjectSynchronizerManager extends TypedEventEmitter<IContainerLiveObjectStoreEvents> {
    private objectStoreMap: ILiveObjectStore = new Map();

    private _audience?: IAzureAudience;
    /**
     * Create a new registry for all of the `LiveObjectSynchronizer` objects for a Live Share session.
     * @param _liveRuntime runtime for the Live Share session.
     */
    public constructor(
        private readonly _liveRuntime: LiveShareRuntime,
        private readonly _containerRuntime: IContainerRuntimeSignaler
    ) {
        super();
    }
    /**
     * The update interval in milliseconds
     */
    public updateInterval = 10000;

    private _synchronizer?: ContainerSynchronizer;

    /**
     * Start listening for changes
     */
    public start() {
        this._containerRuntime.on("signal", this.onReceivedSignal.bind(this));
    }

    /**
     * Stop listening for changes
     */
    public stop() {
        this._containerRuntime.off("signal", this.onReceivedSignal.bind(this));
        this.objectStoreMap.clear();
    }

    /**
     * Set the audience
     */
    public setAudience(audience: IAzureAudience) {
        this._audience = audience;
    }

    /**
     * Register your `LiveObjectSynchronizer`.
     *
     * @param id the unique identifier for the synchronizer
     * @param runtime the IRuntimeSignaler made available through the `DataObject`
     * @param initialState the initial state for the session.
     * @param handlers the handlers for getting and updating state
     */
    public async registerObject<TState>(
        id: string,
        runtime: IRuntimeSignaler,
        initialState: TState,
        handlers: GetAndUpdateStateHandlers<TState>
    ): Promise<void> {
        const initialEvent: ILiveEvent<TState> = {
            clientId: await waitUntilConnected(runtime),
            timestamp: 0, // initial state should always have timestamp of zero, so that it doesn't override remote values
            data: initialState,
            name: UPDATE_EVENT,
        };
        this.updateEventLocallyInStore(id, initialEvent);

        // Get/create containers synchronizer
        if (!this._synchronizer) {
            this._synchronizer = new ContainerSynchronizer(
                runtime,
                this._containerRuntime,
                this._liveRuntime,
                this
            );
        }

        // Register object
        this._synchronizer.registerObject(
            id,
            handlers as unknown as GetAndUpdateStateHandlers<TState>
        );
    }

    /**
     * Unregister your `LiveObjectSynchronizer`.
     *
     * @param id the unique identifier for the synchronizer
     */
    public unregisterObject(id: string): void {
        if (this._synchronizer) {
            const lastObject = this._synchronizer.unregisterObject(id);
            if (lastObject) {
                this._synchronizer = undefined;
            }
        }
    }

    /**
     * Gets the most recent event sent for a given `objectId`.
     * @param objectId the `LiveDataObject` id
     * @returns the latest event sent, or undefined if there is none
     */
    public getLatestEventForObject<TState = any>(
        objectId: string
    ): ILiveEvent<TState> | undefined {
        return this.getEventsForObject(objectId)?.[0];
    }

    /**
     * Gets the most recent event sent for a given `objectId` and `clientId`.
     * @param objectId the `LiveDataObject` id
     * @param clientId the client to get the value for
     * @returns the latest event sent, or undefined if there is none
     */
    public getLatestEventForObjectClient<TState = any>(
        objectId: string,
        clientId: string
    ): ILiveEvent<TState> | undefined {
        return this.objectStoreMap
            .get(objectId)
            ?.get(clientId);
    }

    /**
     * Gets the most recent events sent for a given `objectId`.
     * @param objectId the `LiveDataObject` id
     * @returns the latest events sent, or undefined if there are none
     */
    public getEventsForObject<TState = any>(
        objectId: string
    ): ILiveEvent<TState>[] | undefined {
        const clientMap = this.objectStoreMap.get(objectId);
        if (!clientMap) return undefined;
        return [...clientMap.values()]
            ?.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Sends a one-time event for a given object
     * @param objectId the `LiveDataObject` id
     * @param data the date for the event to send
     * @returns the event that was sent
     */
    public async sendEventForObject<TState = any>(
        objectId: string,
        data: TState
    ): Promise<ILiveEvent<TState>> {
        const valueSent = await this._synchronizer!.sendEventForObject(objectId, data);
        this.updateEventLocallyInStore(objectId, valueSent);
        return valueSent;
    }

    private onReceivedSignal(message: IInboundSignalMessage, local: boolean) {
        if (
            local ||
            !message.clientId ||
            !isILiveEvent(message.content) ||
            typeof message.content.data !== "object"
        )
            return;
        this.dispatchUpdates(
            UPDATE_EVENT,
            message.clientId,
            message.content.timestamp,
            message.content.data,
            local
        );
        // If the non-local user is connecting for the first time
        if (message.type === CONNECT_EVENT) {
            this._synchronizer!.onSendUpdates();
        }
    }

    private dispatchUpdates(
        type: string,
        senderId: string,
        timestamp: number,
        updates: StateSyncEventContent,
        local: boolean
    ) {
        for (const id in updates) {
            const data = updates[id];
            const receivedEvent: ILiveEvent<any> = {
                clientId: senderId,
                timestamp,
                data: cloneValue(data),
                name: type,
            };
            const didUpdate = this.updateEventLocallyInStore(id, receivedEvent);
            if (!didUpdate) continue;
            // if (local) return;
            this.emit(UPDATE_EVENT, id, cloneValue(receivedEvent));
        }
    }

    /**
     * @returns true if it was inserted, or false if it was skipped because the event is older
     */
    private updateEventLocallyInStore(
        objectId: string,
        event: ILiveEvent<any>
    ): boolean {
        let clientMap: ILiveClientEventMap<any> | undefined = this.objectStoreMap.get(objectId);
        if (clientMap) {
            const existingEvent = clientMap.get(event.clientId);
            if (existingEvent) {
                // We already have an event for this user, so we update it if it is newer
                if (!LiveEvent.isNewer(existingEvent, event)) return false;
            }
            clientMap.set(event.clientId, event);
        } else {
            clientMap = new Map();
            clientMap.set(event.clientId, event);
            this.objectStoreMap.set(objectId, clientMap);
        }
        return true;
    }
}



const CONNECT_EVENT = "connect";
const UPDATE_EVENT = "update";

export interface GetAndUpdateStateHandlers<TState> {
    getState: GetSynchronizationState<TState>;
    updateState: UpdateSynchronizationState<TState>;
    getLocalUserCanSend: GetLocalUserCanSend;
}

interface StateSyncEventContent {
    [id: string]: any;
}

class ContainerSynchronizer {
    private readonly _objects = new Map<
        string,
        GetAndUpdateStateHandlers<any>
    >();
    // private _unconnectedKeys: string[] = [];
    private _connectedKeys: string[] = [];
    private _refCount = 0;
    private _hTimer: any;
    private _connectSentForClientId?: string;

    constructor(
        private readonly _runtime: IRuntimeSignaler,
        private readonly _containerRuntime: IContainerRuntimeSignaler,
        private readonly _liveRuntime: LiveShareRuntime,
        private readonly _objectStore: LiveObjectSynchronizerManager
    ) {
        this._runtime.on("connected", this.onConnected.bind(this));
    }

    public registerObject(
        id: string,
        handlers: GetAndUpdateStateHandlers<any>
    ): void {
        if (this._objects.has(id)) {
            throw new Error(
                `LiveObjectSynchronizer: too many calls to registerObject() for object '${id}'`
            );
        }
        this._connectedKeys.push(id);

        // Save object ref
        this._objects.set(id, handlers);
        
        if (
            this._runtime.clientId &&
            this._runtime.clientId !== this._connectSentForClientId
        ) {
            this.onConnected(this._runtime.clientId);
        }

        // Start update timer on first ref
        if (this._refCount++ == 0) {
            this._objectStore.on(UPDATE_EVENT, (objectId, event) => {
                this.onReceiveUpdate(objectId, event);
            });
            this._hTimer = setInterval(() => {
                this.onSendUpdates();
            }, this._liveRuntime.objectManager.updateInterval);
        }
    }

    public unregisterObject(id: string): boolean {
        if (this._objects.has(id)) {
            // Remove object ref
            this._objects.delete(id);

            // Stop update timer on last de-ref
            if (--this._refCount == 0) {
                clearInterval(this._hTimer);
                this._hTimer = undefined;
                this._objectStore.off(
                    "update",
                    this.onReceiveUpdate.bind(this)
                );
                return true;
            }

            // Remove id from key lists
            this._connectedKeys = this._connectedKeys.filter(
                (key) => key != id
            );
        }

        return false;
    }

    public async onSendUpdates(): Promise<void> {
        await this.sendGroupEvent(this._connectedKeys, UPDATE_EVENT);
    }

    /**
     * Sends a one-time event for a given object
     * @param objectId the `LiveDataObject` id
     * @param data the date for the event to send
     * @returns the latest events sent, or undefined if there are none
     */
    public async sendEventForObject<TState = any>(
        objectId: string,
        data: TState
    ): Promise<ILiveEvent<TState>> {
        const handlers = this._objects.get(objectId);
        if (!handlers) {
            throw new Error(
                "ContainerSynchronizer.sendEventForObject(): cannot send an event for an object that is not registered"
            );
        }
        const canSend = await handlers.getLocalUserCanSend(false);
        if (!canSend) {
            throw new Error(
                "The local user doesn't meet the app requirements to send a message for this object"
            );
        }
        // We send as a batch update in case we eventually want to support batching/queuing at this layer, and to reuse existing code.
        const updateEvents = await this.sendEventUpdates(
            {
                [objectId]: data,
            },
            UPDATE_EVENT
        );
        if (!updateEvents) {
            throw new Error("Unable to send an event with empty updates");
        }
        const valueSent = {
            clientId: updateEvents.clientId,
            timestamp: updateEvents.timestamp,
            name: updateEvents.name,
            data: updateEvents.data[objectId],
        };
        return valueSent;
    }

    private async onConnected(clientId: string) {
        if (
            clientId === this._connectSentForClientId
        ) return;

        this._connectSentForClientId = clientId;
        try {
            await this.sendGroupEvent(
                this._connectedKeys,
                CONNECT_EVENT
            );
        } catch (err: any) {
            console.error(
                `LiveObjectSynchronizer: error sending update - ${err.toString()}`
            );
        }
    }

    private async sendEventUpdates(
        updates: StateSyncEventContent,
        evtType: string
    ): Promise<ILiveEvent<StateSyncEventContent> | undefined> {
        const updateKeys = Object.keys(updates);
        // Send event if we have any updates to broadcast
        // - `send` is only set if at least one component returns an update.
        if (updateKeys.length > 0) {
            const content: ILiveEvent<StateSyncEventContent> = {
                clientId: await this.waitUntilConnected(),
                data: updates,
                timestamp: this._liveRuntime.getTimestamp(),
                name: evtType,
            };
            this._containerRuntime.submitSignal(evtType, content);
            return content;
        }
    }

    private async sendGroupEvent(
        keys: string[],
        evtType: string
    ): Promise<{
        sent: string[];
        skipped: string[];
    }> {
        // Compose list of updates
        const skipKeys: string[] = [];
        const updates: StateSyncEventContent = {};
        const localClientId = await this.waitUntilConnected();
        for (let objIndex = 0; objIndex < keys.length; objIndex++) {
            const objectId = keys[objIndex];
            try {
                // Ignore components that return undefined
                const handlers = this._objects.get(objectId);
                if (
                    handlers &&
                    (await handlers.getLocalUserCanSend(
                        evtType === CONNECT_EVENT
                    ))
                ) {
                    const state =
                        this._objectStore.getLatestEventForObjectClient(
                            objectId,
                            localClientId
                        );
                    if (typeof state == "object") {
                        updates[objectId] = state.data;
                        continue;
                    }
                }
            } catch (err: any) {
                console.error(
                    `LiveObjectSynchronizer: error getting an objects state - ${err.toString()}`
                );
            }
            skipKeys.push(objectId);
        }

        const updateKeys = Object.keys(updates);
        // Send event if we have any updates to broadcast
        // - `send` is only set if at least one component returns an update.
        await this.sendEventUpdates(updates, evtType);
        return {
            sent: updateKeys,
            skipped: skipKeys,
        };
    }

    /**
     * On received event update
     */
    private onReceiveUpdate(objectId: string, event: ILiveEvent<any>): void {
        const handler = this._objects.get(objectId);
        if (!handler) return;
        handler.updateState(
            event.name === CONNECT_EVENT,
            event,
            event.clientId
        );
    }

    /**
     * Waits until connected and gets the most recent clientId
     * @returns clientId
     */
    protected waitUntilConnected(): Promise<string> {
        return waitUntilConnected(this._runtime);
    }
}

interface IContainerLiveObjectStoreEvents extends IEvent {
    /**
     * Disposed event is raised when container is closed. If container was closed due to error
     * (vs explicit **dispose** action), optional argument contains further details about the error.
     */
    (
        event: "update",
        listener: (objectId: string, event: ILiveEvent<any>) => void
    ): void;
}

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
     * @param getState A function called to retrieve the objects current state. This will be called prior to a "connect" or "update" message being sent.
     * @param updateState A function called to process a state update received from a remote instance. This will be called anytime a "connect" or "update" message is received.
     * @param getLocalUserCanSend A async function called to determine whether the local user can send a connect/update message. Return true if the user can send the update.
     */
    public start(
        initialState: TState,
        getState: GetSynchronizationState<TState>,
        updateState: UpdateSynchronizationState<TState>,
        getLocalUserCanSend: GetLocalUserCanSend
    ): Promise<void> {
        return this.liveRuntime.objectManager.registerObject<TState>(
            this.id,
            this.runtime,
            initialState,
            {
                getState,
                updateState,
                getLocalUserCanSend,
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
