/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveEvent } from "./LiveEvent";
import { IClientInfo, ILiveEvent, UserMeetingRole } from "./interfaces";
import { TimeInterval } from "./TimeInterval";
import { cloneValue } from "./internals";
import { LiveShareClient } from "./LiveShareClient";

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
    state: PresenceState;
    data?: TData;
}

/**
 * A use that presence is being tracked for.
 */
export class LivePresenceUser<TData = object> {
    private _lastUpdateTime: number;
    readonly _clients: string[] = [];
    private _userId: string;
    private _roles: UserMeetingRole[];
    private _displayName?: string;

    /**
     * @hidden
     */
    constructor(
        _clientInfo: IClientInfo,
        private _evt: ILivePresenceEvent<TData>,
        private _expirationPeriod: TimeInterval,
        private _isLocalUser: boolean
    ) {
        this._userId = _clientInfo.userId;
        this._roles = _clientInfo.roles;
        this._displayName = _clientInfo.displayName;
        this.updateClients(this._evt);
        this._lastUpdateTime = LiveShareClient.getTimestamp();
    }

    /**
     * If `true` the user is the local user.
     */
    public get isLocalUser(): boolean {
        return this._isLocalUser;
    }

    /**
     * ID of the user. Can be undefined when first initialized.
     */
    public get userId(): string {
        return this._userId;
    }

    public get displayName(): string | undefined {
        return this._displayName;
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
        return Promise.resolve(this._roles ?? []);
    }

    /**
     * Returns true if the presence object is from the specified client.
     * @param clientId The ID of the client to lookup.
     */
    public isFromClient(clientId: string): boolean {
        return this._clients.indexOf(clientId) >= 0;
    }

    /**
     * @hidden
     */
    public updateReceived(evt: ILivePresenceEvent<TData>): boolean {
        this.updateClients(evt);
        const current = this._evt;
        if (LiveEvent.isNewer(current, evt)) {
            // Save updated event
            this._evt = evt;
            this._lastUpdateTime = LiveShareClient.getTimestamp();

            // Has anything changed?
            if (
                evt.state != current.state ||
                JSON.stringify(evt.data) != JSON.stringify(current.data)
            ) {
                return true;
            }
        }

        return false;
    }

    private hasExpired(): boolean {
        const now = LiveShareClient.getTimestamp();
        const elapsed = now - this._lastUpdateTime;
        return (
            !this._isLocalUser && elapsed > this._expirationPeriod.milliseconds
        );
    }

    private updateClients(evt: ILivePresenceEvent<TData>): void {
        // The user can be logged into multiple clients so add client to list if missing.
        if (evt.clientId && this._clients.indexOf(evt.clientId) < 0) {
            this._clients.push(evt.clientId);
        }

        if (evt.clientId) {
            LiveShareClient.getClientInfo(evt.clientId)
                .then((info) => {
                    if (info) {
                        this._userId = info?.userId;
                        this._roles = info?.roles;
                        this._displayName = info?.displayName;
                    }
                })
                .catch((e) => {
                    console.warn(e);
                });
        }
    }
}
