import { IRuntimeSignaler } from "../LiveEventScope";
import { LiveShareRuntime } from "../LiveShareRuntime";
import { IContainerRuntimeSignaler, ILiveEvent } from "../interfaces";
import {
    GetAndUpdateStateHandlers,
    StateSyncEventContent,
} from "./internal-interfaces";
import { ThrottledEventQueue } from "./ThrottledEventQueue";
import { LiveObjectManager } from "./LiveObjectManager";
import { ObjectSynchronizerEvents } from "./consts";
import { waitUntilConnected } from "./utils";

/**
 * @hidden
 */
export class ContainerSynchronizer {
    private readonly _objects = new Map<
        string,
        GetAndUpdateStateHandlers<any>
    >();
    private _throttledEventsQueue: ThrottledEventQueue =
        new ThrottledEventQueue(this);
    private _connectedKeys: string[] = [];
    private _refCount = 0;
    private _hTimer: NodeJS.Timeout | undefined;
    private _connectSentForClientId?: string;
    private _onBoundConnectedListener?: (clientId: string) => Promise<void>;
    private _onReceiveObjectUpdateListener?: (
        objectId: string,
        event: ILiveEvent<any>,
        local: boolean
    ) => Promise<void>;
    private _onSendUpdatesIntervalCallback?: () => Promise<void>;

    constructor(
        private readonly _runtime: IRuntimeSignaler,
        private _containerRuntime: IContainerRuntimeSignaler,
        private readonly _liveRuntime: LiveShareRuntime,
        private readonly _objectStore: LiveObjectManager
    ) {
        this.startListeningForConnected();
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

        // Play back the most recent cached event for each clientId to get the initial remote state
        this._objectStore.getEventsForObject(id)?.forEach((event) => {
            this.onReceiveUpdate(
                id,
                event,
                event.clientId === this._runtime.clientId
            );
        });

        // Start update timer on first ref
        if (this._refCount++ == 0) {
            this.startBackgroundObjectUpdates();
        }
    }

    public unregisterObject(id: string): boolean {
        if (this._objects.has(id)) {
            // Remove object ref
            this._objects.delete(id);

            // Stop update timer on last de-ref
            if (--this._refCount == 0) {
                this.stopBackgroundObjectUpdates();
                return true;
            }

            // Remove id from key lists
            this._connectedKeys = this._connectedKeys.filter(
                (key) => key != id
            );
        }

        return false;
    }

    /**
     * On send background updates handler
     *
     * @returns void promise once the events were sent (unless skipped)
     */
    public async onSendBackgroundUpdates(): Promise<void> {
        if (!this._liveRuntime.canSendBackgroundUpdates) return;
        await this.sendGroupEvent(
            this._connectedKeys,
            ObjectSynchronizerEvents.update
        ).catch((err) => console.error(err));
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
                [objectId]: {
                    data,
                    timestamp: this._liveRuntime.getTimestamp(),
                },
            },
            ObjectSynchronizerEvents.update
        );
        if (!updateEvents) {
            throw new Error("Unable to send an event with empty updates");
        }
        const valueSent = {
            clientId: updateEvents.clientId,
            timestamp: updateEvents.data[objectId].timestamp,
            name: updateEvents.name,
            data: updateEvents.data[objectId].data,
        };
        return valueSent;
    }

    /**
     * Sends a one-time event that is throttled for the purposes of consolidating multiple signals into a single one.
     * @param objectId the `LiveDataObject` id
     * @param data the date for the event to send
     * @returns the latest events sent, or undefined if there are none
     */
    public async sendThrottledEventForObject<TState = any>(
        objectId: string,
        data: TState
    ): Promise<ILiveEvent<TState>> {
        const handlers = this._objects.get(objectId);
        if (!handlers) {
            throw new Error(
                "ContainerSynchronizer.sendThrottledEventForObject(): cannot send an event for an object that is not registered"
            );
        }
        const canSend = await handlers.getLocalUserCanSend(false);
        if (!canSend) {
            throw new Error(
                "The local user doesn't meet the app requirements to send a message for this object"
            );
        }
        return await this._throttledEventsQueue.sendWithQueue(objectId, {
            data,
            timestamp: this._liveRuntime.getTimestamp(),
        });
    }

    /**
     * @hidden
     * Send a batch of events
     * @param updates updates to send
     * @param evtType type of event
     * @returns event where data is then StateSyncEventContent containing the batched events that were sent.
     */
    public async sendEventUpdates(
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
                timestamp:
                    evtType === ObjectSynchronizerEvents.connect
                        ? 0 // use zero for connect events because we are sending initial states
                        : this._liveRuntime.getTimestamp(),
                name: evtType,
            };
            this._containerRuntime.submitSignal(evtType, content);
            return content;
        }
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
        if (this._containerRuntime === cRuntime) return;
        this._containerRuntime = cRuntime;
    }

    private async onConnected(clientId: string) {
        if (clientId === this._connectSentForClientId) return;

        if (this._connectSentForClientId) {
            this._objectStore.clientIdDidChange(
                this._connectSentForClientId,
                clientId
            );
        }
        this._connectSentForClientId = clientId;
        // TODO: this is a fatal error if it doesn't succeed, so we should be careful
        this._liveRuntime.host.registerClientId(clientId).catch((error) => {
            console.error(error);
        });
        try {
            await this.sendGroupEvent(
                this._connectedKeys,
                ObjectSynchronizerEvents.connect
            );
        } catch (err: any) {
            console.error(
                `LiveObjectSynchronizer: error sending update - ${err.toString()}`
            );
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
                        evtType === ObjectSynchronizerEvents.connect
                    ))
                ) {
                    const state =
                        this._objectStore.getLatestEventForObjectClient(
                            objectId,
                            localClientId
                        );
                    if (typeof state == "object") {
                        updates[objectId] = {
                            data: state.data,
                            timestamp:
                                handlers.shouldUpdateTimestampPeriodically
                                    ? this._liveRuntime.getTimestamp()
                                    : evtType ===
                                      ObjectSynchronizerEvents.connect
                                    ? 0
                                    : state.timestamp,
                        };
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
    private async onReceiveUpdate(
        objectId: string,
        event: ILiveEvent<any>,
        local: boolean
    ): Promise<void> {
        const handler = this._objects.get(objectId);
        if (!handler) return;
        const overwriteForLocal = await handler.updateState(
            event,
            event.clientId,
            local
        );
        if (!overwriteForLocal) return;
        this._objectStore.updateEventLocallyInStore.bind(this._objectStore)(
            objectId,
            {
                ...event,
                clientId: await this.waitUntilConnected(),
            }
        );
    }

    /**
     * Waits until connected and gets the most recent clientId
     * @returns clientId
     */
    protected waitUntilConnected(): Promise<string> {
        return waitUntilConnected(this._runtime);
    }

    private startListeningForConnected() {
        if (this._onBoundConnectedListener) {
            this.stopListeningForConnected();
        }
        this._onBoundConnectedListener = this.onConnected.bind(this);
        this._runtime.on("connected", this._onBoundConnectedListener);
    }

    private stopListeningForConnected() {
        if (!this._onBoundConnectedListener) return;
        this._runtime.off("connected", this._onBoundConnectedListener);
    }

    private startBackgroundObjectUpdates() {
        // Stop existing background updates
        this.stopBackgroundObjectUpdates();
        // Start receiving object updates
        this._onReceiveObjectUpdateListener = this.onReceiveUpdate.bind(this);
        this._objectStore.on(
            ObjectSynchronizerEvents.update,
            this._onReceiveObjectUpdateListener
        );
        // Set background updates
        this._onSendUpdatesIntervalCallback =
            this.onSendBackgroundUpdates.bind(this);
        this._hTimer = setInterval(
            this._onSendUpdatesIntervalCallback,
            this._liveRuntime.objectManager.updateInterval
        );
    }

    private stopBackgroundObjectUpdates() {
        if (this._hTimer) {
            clearInterval(this._hTimer);
            this._hTimer = undefined;
            this._onSendUpdatesIntervalCallback = undefined;
        }
        if (!this._onReceiveObjectUpdateListener) return;
        this._objectStore.off("update", this._onReceiveObjectUpdateListener);
        this._onReceiveObjectUpdateListener = undefined;
    }
}
