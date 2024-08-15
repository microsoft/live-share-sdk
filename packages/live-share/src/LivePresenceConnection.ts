import {
    LivePresenceReceivedEventData,
    PresenceState,
} from "./LivePresenceUser.js";
import { LiveShareRuntime } from "./internals/LiveShareRuntime.js";
import { TimeInterval } from "./TimeInterval.js";
import { cloneValue, isNewerEvent } from "./internals/utils.js";

/**
 * A connection that presence is being tracked for.
 *
 * A user can join from multiple devices. If they do, they will have multiple connections and a distinct clientId on each device.
 * If the client is disconnected for any reason, and they have to reconnect, they will get a new clientId and thus a new connection.
 */
export class LivePresenceConnection<
    TData extends object | undefined | null = any,
> {
    /**
     * @hidden
     */
    constructor(
        private _evt: LivePresenceReceivedEventData<TData>,
        private _isLocalConnection: boolean,
        private _expirationPeriod: TimeInterval,
        private _liveRuntime: LiveShareRuntime
    ) {}

    /**
     * If `true` the connection is a local connection.
     */
    public get isLocalConnection(): boolean {
        return this._isLocalConnection;
    }

    /**
     * ID of the client.
     */
    public get clientId(): string {
        return this._evt.clientId;
    }

    /**
     * Connections current state.
     *
     * @remarks
     * This is automatically set to `PresenceState.offline` if the users client hasn't sent updates
     * for a period of time.
     */
    public get state(): PresenceState {
        if (this._evt.data.state !== PresenceState.online) {
            return this._evt.data.state;
        } else if (this.hasExpired()) {
            return PresenceState.away;
        }

        return this._evt.data.state;
    }

    /**
     * Optional data shared by the user.
     */
    public get data(): TData {
        return cloneValue(this._evt.data.data);
    }

    /**
     * @hidden
     */
    public updateConnection(evt: LivePresenceReceivedEventData<TData>) {
        if (this._evt.clientId !== evt.clientId) {
            throw new Error(
                `LivePresenceConnection.updateConnection called with event with different clientId`
            );
        }
        if (!isNewerEvent(this._evt, evt)) return;
        this._evt = evt;
    }

    /**
     * @hidden
     */
    public set expirationPeriod(value: TimeInterval) {
        this._expirationPeriod = value;
    }

    private hasExpired(): boolean {
        const now = this._liveRuntime.getTimestamp();
        const elapsed = now - this._evt.timestamp;
        return (
            !this._isLocalConnection &&
            elapsed > this._expirationPeriod.milliseconds
        );
    }
}
