/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveEvent } from "./LiveEvent";
import { ILiveEvent, UserMeetingRole } from "./interfaces";
import { TimeInterval } from "./TimeInterval";
import { cloneValue } from "./internals";

/**
 * List of possible presence states.
 */
export enum PresenceState {
    /**
     * The user is online. Default state while user has at least one client connected.
     */
    online = "online",

    /**
     * The user is away. Applications can set this state based on the users activity.
     */
    away = "away",

    /**
     * The user is offline. Automatically set for users after their client has stopped sending
     * updates for a period of time.
     */
    offline = "offline",
}

/**
 * @hidden
 */
export interface ILivePresenceEvent<TData = object> extends ILiveEvent {
    userId: string;
    state: PresenceState;
    data?: TData;
}

/**
 * A use that presence is being tracked for.
 */
export class LivePresenceUser<TData = object> {
    private _lastUpdateTime: number;

    /**
     * @hidden
     */
    constructor(
        private _evt: ILivePresenceEvent<TData>,
        private _expirationPeriod: TimeInterval,
        private _isLocalUser: boolean
    ) {
        this._lastUpdateTime = LiveEvent.getTimestamp();
    }

    /**
     * If `true` the user is the local user.
     */
    public get isLocalUser(): boolean {
        return this._isLocalUser;
    }

    /**
     * ID of the user.
     */
    public get userId(): string {
        return this._evt.userId;
    }

    /**
     * Users current state.
     *
     * @remarks
     * This is automatically set to `PresenceState.offline` if the users client hasn't sent updates
     * for a period of time.
     */
    public get state(): PresenceState {
        return this.hasExpired() ? PresenceState.offline : this._evt.state;
    }

    /**
     * Optional data shared by the user.
     */
    public get data(): TData | undefined {
        return cloneValue(this._evt.data);
    }

    /**
     * Returns the user's meeting roles.
     */
    public getRoles(): Promise<UserMeetingRole[]> {
        if (this._isLocalUser) {
            return LiveEvent.registerClientId(this._evt.clientId!);
        } else {
            return LiveEvent.getClientRoles(this._evt.clientId!);
        }
    }

    /**
     * @hidden
     */
    public updateReceived(evt: ILivePresenceEvent<TData>): boolean {
        const current = this._evt;
        if (LiveEvent.isNewer(current, evt)) {
            // Save updated event
            this._evt = evt;
            this._lastUpdateTime = LiveEvent.getTimestamp();

            // Has anything changed?
            if (evt.state != current.state || JSON.stringify(evt.data) != JSON.stringify(current.data)) {
                return true;
            }
        }

        return false;
    }

    private hasExpired(): boolean {
        const now = LiveEvent.getTimestamp();
        const elapsed = now - this._lastUpdateTime;
        return !this._isLocalUser && elapsed > this._expirationPeriod.milliseconds;
    }
}
