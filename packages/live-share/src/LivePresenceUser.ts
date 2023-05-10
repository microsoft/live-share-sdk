/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { LiveEvent } from "./LiveEvent";
import { IClientInfo, ILiveEvent, UserMeetingRole } from "./interfaces";
import { TimeInterval } from "./TimeInterval";
import { cloneValue } from "./internals";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { LivePresenceConnection } from "./LivePresenceConnection";

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
export interface ILivePresenceEvent<TData = object> {
    state: PresenceState;
    data?: TData;
}

/**
 * @hidden
 */
export type LivePresenceReceivedEventData<TData = object> = ILiveEvent<
    ILivePresenceEvent<TData>
>;

/**
 * A use that presence is being tracked for.
 */
export class LivePresenceUser<TData = object> {
    private _lastUpdateTime: number;
    private _connections: Map<string, LivePresenceConnection<TData>> =
        new Map();
    private _isLocalUser: boolean = false;

    /**
     * @hidden
     */
    constructor(
        private _clientInfo: IClientInfo,
        private _evt: LivePresenceReceivedEventData<TData>,
        private _expirationPeriod: TimeInterval,
        private _liveRuntime: LiveShareRuntime,
        _isLocalEvent: boolean
    ) {
        this.updateClients(this._evt, _isLocalEvent);
        this._lastUpdateTime = this._liveRuntime.getTimestamp();
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
        return this._clientInfo.userId;
    }

    public get displayName(): string | undefined {
        return this._clientInfo.displayName;
    }

    /**
     * Users current state.
     *
     * @remarks
     * This is automatically set to `PresenceState.offline` if the users client hasn't sent updates
     * for a period of time.
     */
    public get state(): PresenceState {
        return this.hasExpired() ? PresenceState.offline : this._evt.data.state;
    }

    /**
     * Optional data shared by the user. Returns data from connection with most recent event.
     * Client connection specific data is available from each connection.
     */
    public get data(): TData | undefined {
        return cloneValue(this._evt.data.data);
    }

    /**
     * Returns the user's meeting roles.
     */
    public get roles(): UserMeetingRole[] {
        return this._clientInfo.roles;
    }

    /**
     * Returns the user's connections.
     */
    public get connections(): LivePresenceConnection<TData>[] {
        return Array.from(this._connections.values());
    }

    public getConnection(
        clientId: string
    ): LivePresenceConnection<TData> | undefined {
        return this._connections.get(clientId);
    }

    /**
     * Returns true if the presence object is from the specified client.
     * @param clientId The ID of the client to lookup.
     */
    public isFromClient(clientId: string): boolean {
        return this._connections.get(clientId) !== undefined;
    }

    /**
     * @hidden
     */
    public updateReceived(
        evt: LivePresenceReceivedEventData<TData>,
        info: IClientInfo,
        local: boolean
    ): boolean {
        this.updateClients(evt, local);
        const currentEvent = this._evt;
        const currentClientInfo = this._clientInfo;
        if (LiveEvent.isNewer(currentEvent, evt)) {
            // Save updated event
            this._evt = evt;
            this._clientInfo = info;
            this._lastUpdateTime = this._liveRuntime.getTimestamp();

            // Has anything changed?
            return (
                evt.data.state != currentEvent.data.state ||
                JSON.stringify(info) != JSON.stringify(currentClientInfo) ||
                JSON.stringify(evt.data.data) !=
                    JSON.stringify(currentEvent.data.data)
            );
        }

        return false;
    }

    private hasExpired(): boolean {
        const now = this._liveRuntime.getTimestamp();
        const elapsed = now - this._lastUpdateTime;
        return (
            !this._isLocalUser && elapsed > this._expirationPeriod.milliseconds
        );
    }

    private updateClients(
        evt: LivePresenceReceivedEventData<TData>,
        local: boolean
    ): void {
        // The user can be logged into multiple clients
        const connection = this._connections.get(evt.clientId);
        if (connection) {
            connection.updateConnection(evt);
        } else {
            if (local) {
                // local user may have received event from non local connection first,
                // resulting in local user being false, set to true
                this._isLocalUser = local;
            }
            this._connections.set(
                evt.clientId,
                new LivePresenceConnection(
                    evt,
                    local,
                    this._expirationPeriod,
                    this._liveRuntime
                )
            );
        }
    }
}
