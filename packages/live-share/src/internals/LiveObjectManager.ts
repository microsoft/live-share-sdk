/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IInboundSignalMessage } from "@fluidframework/runtime-definitions";
import { TypedEventEmitter } from "@fluidframework/common-utils";
import { IRuntimeSignaler } from "../LiveEventScope";
import { LiveShareRuntime } from "../LiveShareRuntime";
import { IContainerRuntimeSignaler, ILiveEvent } from "../interfaces";
import { LiveEvent } from "../LiveEvent";
import {
    ContainerSynchronizer,
    GetAndUpdateStateHandlers,
    IContainerLiveObjectStoreEvents,
    ILiveClientEventMap,
    ILiveObjectStore,
    ObjectSynchronizerEvents,
    StateSyncEventContent,
    cloneValue,
    isILiveEvent,
    waitUntilConnected,
} from "./";
import { IAzureAudience } from "@fluidframework/azure-client";

/**
 * @hidden
 * Manager of all of the `LiveObjectSynchronizer` objects
 *
 * @remarks
 * This is intended for use through `LiveShareRuntime`.
 */
export class LiveObjectManager extends TypedEventEmitter<IContainerLiveObjectStoreEvents> {
    private objectStoreMap: ILiveObjectStore = new Map();

    private _audience?: IAzureAudience;
    private _synchronizer?: ContainerSynchronizer;

    private _onBoundReceivedSignalListener?: (
        message: IInboundSignalMessage,
        local: boolean
    ) => void;
    /**
     * Create a new registry for all of the `LiveObjectSynchronizer` objects for a Live Share session.
     * @param _liveRuntime runtime for the Live Share session.
     * @param _containerRuntime signal runtime.
     */
    public constructor(
        private readonly _liveRuntime: LiveShareRuntime,
        private _containerRuntime: IContainerRuntimeSignaler
    ) {
        super();
    }
    /**
     * The update interval in milliseconds
     */
    public updateInterval = 10000;

    /**
     * Start listening for changes
     */
    public start() {
        this.startReceivingSignalUpdates();
    }

    /**
     * Stop listening for changes
     */
    public stop() {
        this.stopReceivingSignalUpdates();
        this.objectStoreMap.clear();
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
        this._synchronizer.registerObject(id, handlers);

        const initialEvent: ILiveEvent<TState> = {
            clientId: await waitUntilConnected(runtime),
            timestamp: 0, // initial state should always have timestamp of zero, so that it doesn't override remote values
            data: initialState,
            name: ObjectSynchronizerEvents.update,
        };

        this.updateEventLocallyInStore(id, initialEvent);
    }

    /**
     * Unregister your `LiveObjectSynchronizer`.
     *
     * @param id the unique identifier for the synchronizer
     */
    public unregisterObject(id: string): void {
        if (this._synchronizer) {
            this._synchronizer.unregisterObject(id);
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
        return this.objectStoreMap.get(objectId)?.get(clientId);
    }

    /**
     * Gets the events sent for a given `objectId`, sorted by most recent.
     * @param objectId the `LiveDataObject` id
     * @returns the latest events sent, or undefined if there are none
     */
    public getEventsForObject<TState = any>(
        objectId: string
    ): ILiveEvent<TState>[] | undefined {
        const clientMap = this.objectStoreMap.get(objectId);
        if (!clientMap) return undefined;
        return [...clientMap.values()]?.sort(
            (a, b) => b.timestamp - a.timestamp
        );
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
        if (!this._synchronizer) {
            throw new Error(
                "LiveObjectManager.sendEventForObject: cannot send the event"
            );
        }
        const valueSent = await this._synchronizer.sendEventForObject(
            objectId,
            data
        );
        this.updateEventLocallyInStore(objectId, valueSent);
        return valueSent;
    }

    /**
     * Sends a throttled one-time event for the purposes of consolidating multiple signals into a single one.
     */
    public async sendThrottledEventForObject<TState = any>(
        objectId: string,
        data: TState
    ): Promise<ILiveEvent<TState>> {
        if (!this._synchronizer) {
            throw new Error(
                "LiveObjectManager.sendEventForObject: cannot send the event"
            );
        }
        const valueSent = await this._synchronizer.sendThrottledEventForObject(
            objectId,
            data
        );
        this.updateEventLocallyInStore(objectId, valueSent);
        return valueSent;
    }

    /**
     * @hidden
     * The local client was given a new clientId, move cached events to the new clientId
     */
    public clientIdDidChange(originalClientId: string, newClientId: string) {
        this.objectStoreMap.forEach((objectStore) => {
            const clientEvents = objectStore.get(originalClientId);
            if (!clientEvents) return;
            objectStore.set(newClientId, clientEvents);
            objectStore.delete(originalClientId);
        });
    }

    /**
     * @hidden
     * Do not use this API unless you know what you are doing.
     * Using it incorrectly could cause object synchronizers to stop working.
     * @see LiveShareRuntime.__dangerouslySetContainerRuntime
     */
    public __dangerouslySetContainerRuntime(
        cRuntime: IContainerRuntimeSignaler
    ) {
        // Fluid normally will create new DDS instances with the same runtime, but during some instances they will re-instantiate it.
        if (this._containerRuntime === cRuntime) return;
        // If we already have a _containerRuntime, we technically do not need to re-set it, despite them re-instantiating it.
        // This is because for how we are using it (signals), this has no impact. We still swap out our reference and reset signal
        // event listeners, both for future proofing and as a general good memory practice
        this.stopReceivingSignalUpdates();
        this._containerRuntime = cRuntime;
        this.startReceivingSignalUpdates();
        this._synchronizer?.__dangerouslySetContainerRuntime(cRuntime);
    }

    /**
     * Set the audience
     */
    public setAudience(audience: IAzureAudience) {
        this._audience = audience;
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
            ObjectSynchronizerEvents.update,
            message.clientId,
            message.content.data,
            local
        );
        // If the non-local user is connecting for the first time
        if (message.type === ObjectSynchronizerEvents.connect) {
            this._synchronizer?.onSendBackgroundUpdates();
        }
    }

    private dispatchUpdates(
        type: string,
        senderId: string,
        updates: StateSyncEventContent,
        local: boolean
    ) {
        for (const id in updates) {
            const data = updates[id];
            const receivedEvent: ILiveEvent<any> = {
                clientId: senderId,
                timestamp: data.timestamp,
                data: cloneValue(data.data),
                name: type,
            };
            const didUpdate = this.updateEventLocallyInStore(id, receivedEvent);
            if (!didUpdate) continue;
            // if (local) return;
            this.emit(
                ObjectSynchronizerEvents.update,
                id,
                cloneValue(receivedEvent),
                local
            );
        }
    }

    /**
     * @hidden
     * Updates the local event in memory for a given clientId
     *
     * @returns true if it was inserted, or false if it was skipped because the event is older
     */
    public updateEventLocallyInStore(
        objectId: string,
        event: ILiveEvent<any>
    ): boolean {
        let clientMap: ILiveClientEventMap<any> | undefined =
            this.objectStoreMap.get(objectId);
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

    private startReceivingSignalUpdates() {
        if (this._onBoundReceivedSignalListener) {
            this.stopReceivingSignalUpdates();
        }
        this._onBoundReceivedSignalListener = this.onReceivedSignal.bind(this);
        this._containerRuntime.on(
            "signal",
            this._onBoundReceivedSignalListener
        );
    }

    private stopReceivingSignalUpdates() {
        if (!this._onBoundReceivedSignalListener) return;
        this._containerRuntime.off(
            "signal",
            this._onBoundReceivedSignalListener
        );
    }
}
