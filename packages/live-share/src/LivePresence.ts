/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory } from "@fluidframework/aqueduct";
import { IEvent } from "@fluidframework/common-definitions";
import { LiveEventScope } from "./LiveEventScope";
import { LiveEventTarget } from "./LiveEventTarget";
import {
    LivePresenceUser,
    PresenceState,
    ILivePresenceEvent,
    LivePresenceReceivedEventData,
} from "./LivePresenceUser";
import { LiveObjectSynchronizer } from "./LiveObjectSynchronizer";
import { LiveTelemetryLogger } from "./LiveTelemetryLogger";
import { cloneValue, TelemetryEvents } from "./internals";
import { TimeInterval } from "./TimeInterval";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";
import { IClientInfo, ILiveEvent, UserMeetingRole } from "./interfaces";
import { LiveDataObject } from "./LiveDataObject";

/**
 * Events supported by `LivePresence` object.
 */
export enum LivePresenceEvents {
    /**
     * The presence for the local or a remote user has changed.
     */
    presenceChanged = "presenceChanged",
}

/**
 * Event typings for `LivePresence` class.
 * @template TData Type of data object to share with clients.
 */
export interface ILivePresenceEvents<TData extends object = object>
    extends IEvent {
    /**
     * The presence information for the local or a remote user has changed.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.user Presence information that changed.
     * @param listener.local If true the local users presence changed.
     */
    (
        event: "presenceChanged",
        listener: (user: LivePresenceUser<TData>, local: boolean) => void
    ): any;
}

/**
 * Live fluid object that synchronizes presence information for the user with other clients.
 * @template TData Type of data object to share with clients.
 */
export class LivePresence<
    TData extends object = object
> extends LiveDataObject<{
    Events: ILivePresenceEvents<TData>;
}> {
    private _logger?: LiveTelemetryLogger;
    private _expirationPeriod = new TimeInterval(20000);
    private _users: LivePresenceUser<TData>[] = [];
    private _lastEmitPresenceStateMap = new Map<string, PresenceState>();
    private _currentPresence?: LivePresenceReceivedEventData<TData>;

    private _synchronizer?: LiveObjectSynchronizer<ILivePresenceEvent<TData>>;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:LivePresence`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LivePresence.TypeName,
        LivePresence,
        [],
        {}
    );

    /**
     * Returns true if the object has been initialized.
     */
    public get isInitialized(): boolean {
        return !!this._synchronizer;
    }

    /**
     * @deprecated isInitialized should be used instead
     * Returns true if the object has been initialized.
     */
    public get isStarted(): boolean {
        return this.isInitialized;
    }

    /**
     * Number of seconds without a presence update before a remote user is considered offline.
     *
     * @remarks
     * Defaults to a value of `20` seconds. The minimum value is 0.1 seconds for testing purposes.
     */
    public get expirationPeriod(): number {
        return this._expirationPeriod.seconds;
    }

    public set expirationPeriod(value: number) {
        this._expirationPeriod.seconds = value > 0.1 ? value : 0.1;
    }

    /**
     * Optional data object shared by the user.
     */
    public get data(): TData | undefined {
        if (!this._currentPresence) return undefined;
        return cloneValue(this._currentPresence.data.data);
    }

    /**
     * The users current presence state.
     */
    public get state(): PresenceState {
        if (!this._currentPresence) return PresenceState.offline;
        return this._currentPresence.data.state;
    }

    /**
     * Returns the ID of the local user.
     */
    public get userId(): string | undefined {
        const clientId = this._currentPresence?.clientId;
        if (!clientId) {
            return undefined;
        }
        return this._users.find((user) => user._clients.includes(clientId))
            ?.userId;
    }

    /**
     * Starts sharing presence information.
     * @param data Optional. Custom data object to sshare. A deep copy of the data object is saved to avoid any accidental modifications.
     * @param state Optional. Initial presence state. Defaults to `PresenceState.online`.
     * @param allowedRoles Optional. List of roles allowed to emit presence changes.
     */
    public async initialize(
        data?: TData,
        state = PresenceState.online,
        allowedRoles?: UserMeetingRole[]
    ): Promise<void> {
        if (this._synchronizer) {
            throw new Error(`LivePresence: already started.`);
        }
        this._logger = new LiveTelemetryLogger(this.runtime, this.liveRuntime);

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer<
            ILivePresenceEvent<TData>
        >(this.id, this.runtime, this.liveRuntime);
        await this._synchronizer!.start(
            {
                state,
                data,
            },
            (connecting) => {
                // Update timestamp for current presence
                // - If we don't do this the user will timeout and show as "offline" for all other
                //   clients. That's because the LiveEvent.isNewer() check will fail.  Updating
                //   the timestamp of the outgoing update is the best way to show proof that the client
                //   is still alive.
                this._currentPresence!.timestamp =
                    this.liveRuntime.getTimestamp();

                // Return current presence
                return this._currentPresence!.data;
            },
            (connecting, state, sender) => {
                // Add user to list
                this.updateMembersList(state, false);
            },
            async (connecting) => {
                if (connecting) return true;
                // If user has eligible roles, allow the update to be sent
                try {
                    return await this.verifyLocalUserRoles();
                } catch {
                    return false;
                }
            }
        );
        // make sure client info for local user is available
        this._currentPresence = this._synchronizer!.getLatestEventForClient(await this.waitUntilConnected());
        // Broadcast initial presence, or silently fail trying
        this.update(
            this._currentPresence!.data.data,
            this._currentPresence!.data.state
        ).catch(() => {});
        // Update remote user initial presence for existing values
        this._synchronizer!.getEvents()?.forEach((evt) => {
            if (evt.clientId === this._currentPresence?.clientId) return;
            // Add user to list
            this.updateMembersList(evt, false);
        });
    }

    /**
     * Disposes of the object when its container is disposed of.
     */
    public dispose(): void {
        super.dispose();
        if (this._synchronizer) {
            this._synchronizer.dispose();
        }
    }

    /**
     * Returns a snapshot of the current list of presence objects being tracked.
     * @param filter Optional. Presence state to filter enumeration to.
     * @returns Array of presence objects.
     */
    public toArray(filter?: PresenceState): LivePresenceUser<TData>[] {
        const list: LivePresenceUser<TData>[] = [];
        this.forEach((presence) => list.push(presence), filter);
        return list;
    }

    /**
     * Updates the local user's presence shared data object and/or state.
     *
     * @remarks
     * This will trigger the immediate broadcast of the users presence to all other clients.
     * @param data Optional. Data object to change. A deep copy of the data object is saved to avoid any future changes.
     * @param state Optional. Presence state to change.
     */
    public async update(data?: TData, state?: PresenceState): Promise<void> {
        if (!this._synchronizer || !this._currentPresence) {
            throw new Error(`LivePresence: not started.`);
        }

        // Broadcast state change
        const evt = await this._synchronizer!.sendEvent({
            state: state ?? this._currentPresence.data.state,
            data: cloneValue(data) ?? this._currentPresence.data.data,
        });

        // Update local presence immediately
        // - The _updatePresenceEvent won't be triggered until the presence change is actually sent. If
        //   the client is disconnected this could be several seconds later.
        this._currentPresence = evt;
        this.updateMembersList(evt, true);
    }

    /**
     * Enumerates each user the object is tracking presence for.
     * @param callback Function to call for each user.
     * @param callback.user Current presence information for a user.
     * @param filter Optional. Presence state to filter enumeration to.
     */
    public forEach(
        callback: (user: LivePresenceUser<TData>) => void,
        filter?: PresenceState
    ): void {
        this._users.forEach((user) => {
            // Ensure user matches filter
            if (filter == undefined || user.state == filter) {
                callback(user);
            }
        });
    }

    /**
     * Counts the number of users that the object is tracking presence for.
     * @param filter Optional. Presence state to filter count to.
     * @returns Total number of other users we've seen or number of users with a given presence status.
     */
    public getCount(filter?: PresenceState): number {
        if (filter != undefined) {
            let cnt = 0;
            this._users.forEach((user) => {
                if (user.state == filter) {
                    cnt++;
                }
            });

            return cnt;
        }

        return this._users.length;
    }

    /**
     * Returns the current presence info for a specific client ID.
     * @param clientId The ID of the client to retrieve.
     * @returns The current presence information for the client if they've connected to the space.
     */
    public getPresenceForClient(
        clientId: string
    ): LivePresenceUser<TData> | undefined {
        for (let i = 0; i < this._users.length; i++) {
            const user = this._users[i];
            if (user.isFromClient(clientId)) {
                return user;
            }
        }

        return undefined;
    }

    /**
     * Returns the current presence info for a specific user.
     * @param userId The ID of the user to retrieve.
     * @returns The current presence information for the user if they've connected to the space.
     */
    public getPresenceForUser(
        userId: string
    ): LivePresenceUser<TData> | undefined {
        for (let i = 0; i < this._users.length; i++) {
            const user = this._users[i];
            if (user.userId == userId) {
                return user;
            }
        }

        return undefined;
    }

    private updateMembersList(
        evt: LivePresenceReceivedEventData<TData>,
        local: boolean,
        initLocalClientInfo?: IClientInfo
    ): void {
        if (!evt.clientId) return;
        this.liveRuntime
            .verifyRolesAllowed(evt.clientId, this._allowedRoles)
            .then((allowed) => {
                if (!allowed) return;
                if (initLocalClientInfo) {
                    this.updateMembersListWithInfo(
                        evt,
                        local,
                        initLocalClientInfo
                    );
                } else if (evt.clientId) {
                    this.liveRuntime
                        .getClientInfo(evt.clientId)
                        .then((info) => {
                            if (!info) return;

                            if (this.useTransientParticipantWorkaround(info)) {
                                this.transientParticipantWorkaround(
                                    evt,
                                    local,
                                    info
                                );
                            } else {
                                // normal flow
                                this.updateMembersListWithInfo(
                                    evt,
                                    local,
                                    info
                                );
                            }
                        })
                        .catch((err) => {
                            this._logger?.sendErrorEvent(
                                TelemetryEvents.LivePresence
                                    .RoleVerificationError,
                                err
                            );
                        });
                }
            })
            .catch((err) => {
                this._logger?.sendErrorEvent(
                    TelemetryEvents.LiveState.RoleVerificationError,
                    err
                );
            });
    }

    private useTransientParticipantWorkaround(info: IClientInfo): boolean {
        // for some reason, for non local users, tmp roster transiently doesn't contain a meeting participant.
        // When the particpant is missing the `info` matches `defaultUserInfo`.
        const defaultUserInfo: IClientInfo = {
            userId: info.userId,
            roles: [UserMeetingRole.guest],
            displayName: undefined,
        };
        return JSON.stringify(info) === JSON.stringify(defaultUserInfo);
    }

    private transientParticipantWorkaround(
        evt: LivePresenceReceivedEventData<TData>,
        local: boolean,
        info: IClientInfo
    ): void {
        // when participant is missing, use existing information instead.
        const user = this._users.find((user) => user.userId === info.userId);
        if (user) {
            const existingInfo: IClientInfo = {
                userId: user.userId,
                roles: user.roles,
                displayName: user.displayName,
            };
            this.updateMembersListWithInfo(evt, local, existingInfo);
        }
    }

    private updateMembersListWithInfo(
        evt: LivePresenceReceivedEventData<TData>,
        local: boolean,
        info: IClientInfo
    ): void {
        const emitEvent = (user: LivePresenceUser<TData>) => {
            this._lastEmitPresenceStateMap.set(user.userId, user.state);
            this.emit(LivePresenceEvents.presenceChanged, user, local);
            if (local) {
                this._logger?.sendTelemetryEvent(
                    TelemetryEvents.LivePresence.LocalPresenceChanged,
                    { user: evt }
                );
            } else {
                this._logger?.sendTelemetryEvent(
                    TelemetryEvents.LivePresence.RemotePresenceChanged,
                    { user: evt }
                );
            }
        };

        let isNewUser = true;
        for (let pos = 0; pos < this._users.length; pos++) {
            const checkUser = this._users[pos];
            if (info.userId === checkUser.userId) {
                // User found. Apply update and check for changes
                if (checkUser.updateReceived(evt, info)) {
                    emitEvent(checkUser);
                }
                isNewUser = false;
            } else if (
                this._lastEmitPresenceStateMap.get(checkUser.userId) !==
                checkUser.state
            ) {
                // The user's PresenceState has changed
                emitEvent(checkUser);
            }
        }
        if (!isNewUser) return;

        // Insert new user and send change event
        const newUser = new LivePresenceUser<TData>(
            info,
            evt,
            this._expirationPeriod,
            evt.clientId === this._currentPresence?.clientId,
            this.liveRuntime
        );
        this._users.push(newUser);
        emitEvent(newUser);
    }
}

/**
 * Register `LivePresence` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LivePresence, LivePresence.TypeName);
