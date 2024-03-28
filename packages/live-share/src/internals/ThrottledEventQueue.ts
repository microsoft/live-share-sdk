import { ILiveEvent } from "../interfaces";
import { ContainerSynchronizer } from "./ContainerSynchronizer";
import { Deferred } from "./Deferred";
import { ObjectSynchronizerEvents } from "./consts";
import { UnexpectedError } from "../errors";
import { StateSyncEventContent } from "./internal-interfaces";

/**
 * @hidden
 * Queue for grouping multiple signal events together.
 *
 * @remarks
 * See {@link ContainerSynchronizer} for usage.
 */
export class ThrottledEventQueue {
    private _containerSynchronizer: ContainerSynchronizer;
    private _events: StateSyncEventContent = {};
    private _throttleIntervalMilli: number;
    private _deferred: Deferred<ILiveEvent<StateSyncEventContent>> | undefined;
    private _hTimer?: any;
    /**
     * @hidden
     * Queue for grouping multiple signal events together.
     *
     * @param synchronizer container synchronizer to send the events through
     * @param throttleIntervalMilli interval for throttling
     */
    constructor(
        synchronizer: ContainerSynchronizer,
        throttleIntervalMilli: number = 50
    ) {
        this._containerSynchronizer = synchronizer;
        this._throttleIntervalMilli = throttleIntervalMilli;
    }

    /**
     * Send an event with a queue.
     * This will schedule a new batch to be sent if one is not already scheduled.
     */
    public async sendWithQueue<TState = any>(
        objectId: string,
        event: Omit<ILiveEvent<any>, "name" | "clientId">
    ): Promise<ILiveEvent<TState>> {
        this._events[objectId] = event;
        if (!this._hTimer) {
            this._deferred = new Deferred<ILiveEvent<StateSyncEventContent>>();
            this._hTimer = setTimeout(async () => {
                try {
                    const response =
                        await this._containerSynchronizer.sendEventUpdates(
                            this._events,
                            ObjectSynchronizerEvents.update
                        );
                    UnexpectedError.assert(
                        !!response,
                        "ThrottledEventQueue",
                        "unable to send empty set of updates, which should not occur."
                    );
                    this._deferred?.resolve(response);
                } catch (error: unknown) {
                    this._deferred?.reject(error);
                } finally {
                    this._events = {};
                    this._hTimer = undefined;
                }
            }, this._throttleIntervalMilli);
        }
        UnexpectedError.assert(
            !!this._deferred,
            "ThrottledEventQueue",
            "no deferred set, which should not occur."
        );
        const response = await this._deferred.promise;
        return {
            clientId: response.clientId,
            timestamp: response.data[objectId].timestamp,
            name: response.name,
            data: response.data[objectId].data,
        };
    }
}
