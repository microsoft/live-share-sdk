/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IClientInfo, ILiveEvent, UserMeetingRole } from "./interfaces.js";
import { TimeInterval } from "./TimeInterval.js";
import { LiveShareRuntime } from "./internals/LiveShareRuntime.js";
import { LivePresenceConnection } from "./LivePresenceConnection.js";
import { cloneValue, isNewerEvent } from "./internals/utils.js";
import { LivePresenceData } from "./LivePresence.js";

/**
 * List of possible presence status states.
 */
export enum PresenceStatus {
    /**
     * The user is online. Default state while user has at least one client connected.
     */
    online = "online",

    /**
     * The user is away. Automatically set for users after their client has stopped sending
     * updates for a period of time. @see LivePresence.expirationPeriod.
     */
    away = "away",

    /**
     * The user is offline.
     */
    offline = "offline",
}

/**
 * @deprecated
 * Use {@link PresenceStatus} instead.
 */
export const PresenceState = PresenceStatus;

/**
 * @hidden
 */
export interface ILivePresenceEvent<TData extends LivePresenceData = any> {
    status: PresenceStatus;
    data: TData;
}

/**
 * @hidden
 */
export type LivePresenceReceivedEventData<
    TData extends LivePresenceData = any,
> = ILiveEvent<ILivePresenceEvent<TData>>;

/**
 * A user that presence is being tracked for.
 */
export class LivePresenceUser<TData extends LivePresenceData = any> {
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
        _constructedFromLocalEvent: boolean
    ) {
        this.updateClients(this._evt, _constructedFromLocalEvent);
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
     * This is automatically set to `PresenceStatus.offline` if the users client hasn't sent updates
     * for a period of time.
     */
    public get status(): PresenceStatus {
        if (this._evt.data.status !== PresenceStatus.online) {
            return this._evt.data.status;
        } else if (this.hasExpired()) {
            return PresenceStatus.away;
        }

        return this._evt.data.status;
    }

    /**
     * @deprecated
     * Please use {@link LivePresenceConnection.status} instead.
     * This will be removed in a future release.
     */
    public get state(): PresenceStatus {
        return this.status;
    }

    /**
     * Optional data shared by the user. Returns data from connection with most recent event.
     * Client connection specific data is available from each connection.
     */
    public get data(): TData {
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
     * See {@link LivePresenceConnection}
     */
    public getConnections(
        filter?: PresenceStatus
    ): LivePresenceConnection<TData>[] {
        const list: LivePresenceConnection<TData>[] = [];
        this._connections.forEach((connection) => {
            // Ensure connection matches filter
            if (filter == undefined || connection.status == filter) {
                list.push(connection);
            }
        });
        return list;
    }

    /**
     * Returns the user's connection associated with clientId.
     * See {@link LivePresenceConnection}
     * @param clientId The ID of the client to lookup.
     */
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
        localEvent: boolean
    ): boolean {
        const remoteUserConvertedToLocal = this.updateClients(evt, localEvent);
        const currentEvent = this._evt;
        const currentClientInfo = this._clientInfo;
        if (isNewerEvent(currentEvent, evt)) {
            // Save updated event, but change state of LivePresenceUser to reflect aggregate of connection states.
            const aggregateState = this.aggregateConnectionState();
            const aggregateStateEvent = cloneValue(evt);
            aggregateStateEvent.data.status = aggregateState;

            this._evt = aggregateStateEvent;
            this._clientInfo = info;
            this._lastUpdateTime = this._liveRuntime.getTimestamp();

            // Has anything changed?
            return (
                remoteUserConvertedToLocal ||
                aggregateStateEvent.data.status != currentEvent.data.status ||
                JSON.stringify(info) != JSON.stringify(currentClientInfo) ||
                JSON.stringify(evt.data.data) !=
                    JSON.stringify(currentEvent.data.data)
            );
        }

        return remoteUserConvertedToLocal;
    }

    private aggregateConnectionState(): PresenceStatus {
        return Array.from(this._connections.entries())
            .map((c) => c[1].status)
            .reduce<PresenceStatus>((previous, current) => {
                if (
                    previous === PresenceStatus.online ||
                    current === PresenceStatus.online
                ) {
                    return PresenceStatus.online;
                } else if (
                    previous === PresenceStatus.away ||
                    current === PresenceStatus.away
                ) {
                    return PresenceStatus.away;
                }
                return PresenceStatus.offline;
            }, PresenceStatus.offline);
    }

    /**
     * @hidden
     */
    public set expirationPeriod(value: TimeInterval) {
        this._expirationPeriod = value;
        this._connections.forEach((connection) => {
            connection.expirationPeriod = value;
        });
    }

    private hasExpired(): boolean {
        const now = this._liveRuntime.getTimestamp();
        const elapsed = now - this._lastUpdateTime;
        return (
            !this._isLocalUser && elapsed > this._expirationPeriod.milliseconds
        );
    }

    // returns true if localUser set to true for the first time
    private updateClients(
        evt: LivePresenceReceivedEventData<TData>,
        localEvent: boolean
    ): boolean {
        // The user can be logged into multiple clients
        const connection = this._connections.get(evt.clientId);
        if (connection) {
            connection.updateConnection(evt);
            return false;
        } else {
            this._connections.set(
                evt.clientId,
                new LivePresenceConnection(
                    evt,
                    localEvent,
                    this._expirationPeriod,
                    this._liveRuntime
                )
            );
            if (localEvent && !this._isLocalUser) {
                // local user may have received event from non local connection first,
                // resulting in local user being false, set to true
                this._isLocalUser = localEvent;
                return true;
            }
            return false;
        }
    }
}
