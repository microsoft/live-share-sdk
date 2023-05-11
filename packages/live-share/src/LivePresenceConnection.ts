import { cloneValue } from "./internals";
import {
    LivePresenceReceivedEventData,
    PresenceState,
} from "./LivePresenceUser";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { TimeInterval } from "./TimeInterval";

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
        this._evt = evt;
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
