import { cloneValue } from "./internals";
import { LiveEvent } from "./LiveEvent";
import {
    LivePresenceReceivedEventData,
    PresenceState,
} from "./LivePresenceUser";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { TimeInterval } from "./TimeInterval";

/**
 * A connection that presence is being tracked for.
 */
export class LivePresenceConnection<TData = object> {
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
        return this.hasExpired() ? PresenceState.offline : this._evt.data.state;
    }

    /**
     * Optional data shared by the user.
     */
    public get data(): TData | undefined {
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
        if (!LiveEvent.isNewer(this._evt, evt)) return;
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
