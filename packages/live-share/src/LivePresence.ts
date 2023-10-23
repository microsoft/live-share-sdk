/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { DataObjectFactory } from "@fluidframework/aqueduct";
import { IEvent } from "@fluidframework/common-definitions";
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
import {
    IClientInfo,
    LiveDataObjectInitializeState,
    UserMeetingRole,
} from "./interfaces";
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
     * @param listener.local If true the local client initiated this presence change.
     * @param listener.clientId The client ID for the user that send this message.
     */
    (
        event: "presenceChanged",
        listener: (
            user: LivePresenceUser<TData>,
            local: boolean,
            clientId: string
        ) => void
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
        this.getUsers().forEach((user) => {
            user.expirationPeriod = this._expirationPeriod;
        });
    }

    /**
     * Local LivePresenceUser.
     * Can be undefined before LivePresence is initialized.
     */
    public get localUser(): LivePresenceUser<TData> | undefined {
        const clientId = this._currentPresence?.clientId;
        if (!clientId) return undefined;
        return this.getUserForClient(clientId);
    }

    /**
     * Initialize the object to begin sending/receiving presence updates through this DDS.
     *
     * @param data Optional. Custom data object to share. A deep copy of the data object is saved to avoid any accidental modifications.
     * @param state Optional. Initial presence state. Defaults to `PresenceState.online`.
     * @param allowedRoles Optional. List of roles allowed to emit presence changes.
     *
     * @returns a void promise that resolves once complete.
     *
     * @throws error when `.initialize()` has already been called for this class instance.
     * @throws fatal error when `.initialize()` has already been called for an object of same id but with a different class instance.
     * This is most common when using dynamic objects through Fluid.
     */
    public async initialize(
        data?: TData,
        state = PresenceState.online,
        allowedRoles?: UserMeetingRole[]
    ): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.needed) {
            throw new Error(`LivePresence already started.`);
        }
        // This error should not happen due to `initializeState` enum, but if it is somehow defined at this point, errors will occur.
        if (this._synchronizer) {
            throw new Error(
                `LivePresence: _synchronizer already set, which is an unexpected error. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        // Update initialize state as pending
        this.initializeState = LiveDataObjectInitializeState.pending;
        this._logger = new LiveTelemetryLogger(this.runtime, this.liveRuntime);

        // Save off allowed roles
        this._allowedRoles = allowedRoles || [];

        // Set default presence
        this._currentPresence = {
            clientId: await this.waitUntilConnected(),
            name: "UpdatePresence",
            timestamp: 0,
            data: {
                state,
                data,
            },
        };

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer<
            ILivePresenceEvent<TData>
        >(this.id, this.runtime, this.liveRuntime);
        try {
            await this._synchronizer!.start(
                this._currentPresence!.data,
                async (state, sender, local) => {
                    // Add user to list
                    await this.updateMembersList(state, local);
                    return false;
                },
                async (connecting) => {
                    if (connecting) return true;
                    // If user has eligible roles, allow the update to be sent
                    try {
                        return await this.verifyLocalUserRoles();
                    } catch {
                        return false;
                    }
                },
                true // We want to update the timestamp periodically so that we know if a user is active
            );
        } catch (error: unknown) {
            // Update initialize state as fatal error
            this.initializeState = LiveDataObjectInitializeState.fatalError;
            throw error;
        }
        // Update initialize state as succeeded.
        // We do before sending initial update, since that requires this to happen first.
        this.initializeState = LiveDataObjectInitializeState.succeeded;

        // Broadcast initial presence, or silently fail trying.
        // Throttled so that a developer can have multiple presence instances in their app in a performant manner.
        await this.updateInternal(
            this._currentPresence!.data.data,
            this._currentPresence!.data.state,
            true
        ).catch(() => {});
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
    public getUsers(filter?: PresenceState): LivePresenceUser<TData>[] {
        if (!filter) return this._users;
        return this._users.filter((user) => user.state == filter);
    }

    /**
     * Updates the local user's presence shared data object and/or state.
     *
     * @remarks
     * This will trigger the immediate broadcast of the users presence to all other clients.
     *
     * @param data Optional. Data object to change. A deep copy of the data object is saved to avoid any future changes.
     * @param state Optional. Presence state to change.
     *
     * @returns a void promise that resolves once the update event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles defined through the `allowedRoles` prop in `.initialize()`.
     */
    public async update(data?: TData, state?: PresenceState): Promise<void> {
        return await this.updateInternal(data, state);
    }

    /**
     * Returns the current presence info for a specific client ID.
     * @param clientId The ID of the client to retrieve.
     * @returns The current presence information for the client if they've connected to the space.
     */
    public getUserForClient(
        clientId: string
    ): LivePresenceUser<TData> | undefined {
        return this._users.find((user) => user.isFromClient(clientId));
    }

    /**
     * Returns the current presence info for a specific user.
     * @param userId The ID of the user to retrieve.
     * @returns The current presence information for the user if they've connected to the space.
     */
    public getUser(userId: string): LivePresenceUser<TData> | undefined {
        return this._users.find((user) => user.userId == userId);
    }

    /**
     * Internal method to send an update, with optional ability to throttle.
     */
    private async updateInternal(
        data?: TData,
        state?: PresenceState,
        throttle: boolean = false
    ): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LivePresence: not initialized prior to calling \`.update()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this._synchronizer) {
            throw new Error(
                `LivePresence: this._synchronizer is undefined, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        if (!this._currentPresence) {
            throw new Error(
                `LivePresence: this._currentPresence is undefined, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }

        // Broadcast state change
        const evtToSend = {
            state: state ?? this._currentPresence.data.state,
            data: cloneValue(data) ?? this._currentPresence.data.data,
        };
        const evt = throttle
            ? await this._synchronizer!.sendThrottledEvent(evtToSend)
            : await this._synchronizer!.sendEvent(evtToSend);
        await this.updateMembersList(evt, true);
    }

    /**
     * returns true if the change was applied to the member list
     */
    private async updateMembersList(
        evt: LivePresenceReceivedEventData<TData>,
        localEvent: boolean
    ): Promise<boolean> {
        try {
            const allowed = await this.liveRuntime.verifyRolesAllowed(
                evt.clientId,
                this._allowedRoles
            );
            if (!allowed) return false;
            // Update local presence immediately
            // - The _updatePresenceEvent won't be triggered until the presence change is actually sent. If
            //   the client is disconnected this could be several seconds later.
            if (localEvent) {
                this._currentPresence = evt;
            }
            const info = await this.liveRuntime.getClientInfo(evt.clientId);
            // So if undefined
            if (!info) return false;

            if (this.useTransientParticipantWorkaround(info)) {
                return this.transientParticipantWorkaround(
                    evt,
                    localEvent,
                    info
                );
            }
            // normal flow
            return this.updateMembersListWithInfo(evt, localEvent, info);
        } catch (err) {
            this._logger?.sendErrorEvent(
                TelemetryEvents.LiveState.RoleVerificationError,
                err
            );
        }
        return false;
    }

    /**
     * For some reason, for non local users, tmp roster transiently doesn't contain a meeting participant.
     * When the particpant is missing the `info` matches `defaultUserInfo`.
     * @returns true if the info matches the default user info
     */
    private useTransientParticipantWorkaround(info: IClientInfo): boolean {
        const defaultUserInfo: IClientInfo = {
            userId: info.userId,
            roles: [UserMeetingRole.guest],
            displayName: undefined,
        };
        return JSON.stringify(info) === JSON.stringify(defaultUserInfo);
    }

    /**
     * Uses `updateMembersListWithInfo` with the latest value rather than using the incorrect default client info response.
     * @returns true if user presence record was updated
     */
    private transientParticipantWorkaround(
        evt: LivePresenceReceivedEventData<TData>,
        localEvent: boolean,
        info: IClientInfo
    ): boolean {
        // when participant is missing, use existing information instead.
        const user = this._users.find((user) => user.userId === info.userId);
        if (user) {
            const existingInfo: IClientInfo = {
                userId: user.userId,
                roles: user.roles,
                displayName: user.displayName,
            };
            return this.updateMembersListWithInfo(
                evt,
                localEvent,
                existingInfo
            );
        }
        // This user has not yet been inserted, so we attempt to insert it with defaultUserInfo
        return this.updateMembersListWithInfo(evt, localEvent, info);
    }

    private updateMembersListWithInfo(
        evt: LivePresenceReceivedEventData<TData>,
        localEvent: boolean,
        info: IClientInfo
    ): boolean {
        const emitEvent = (user: LivePresenceUser<TData>) => {
            this._lastEmitPresenceStateMap.set(user.userId, user.state);
            this.emit(
                LivePresenceEvents.presenceChanged,
                user,
                localEvent,
                evt.clientId
            );
            if (localEvent) {
                this._logger?.sendTelemetryEvent(
                    TelemetryEvents.LivePresence.LocalPresenceChanged,
                    null,
                    { user: JSON.stringify(evt) }
                );
            } else {
                this._logger?.sendTelemetryEvent(
                    TelemetryEvents.LivePresence.RemotePresenceChanged,
                    null,
                    { user: JSON.stringify(evt) }
                );
            }
        };

        let didUpdate = false;
        let isNewUser = true;
        for (let pos = 0; pos < this._users.length; pos++) {
            const checkUser = this._users[pos];
            if (info.userId === checkUser.userId) {
                // User found. Apply update and check for changes
                if (checkUser.updateReceived(evt, info, localEvent)) {
                    emitEvent(checkUser);
                    didUpdate = true;
                }
                isNewUser = false;
            } else if (
                this._lastEmitPresenceStateMap.get(checkUser.userId) !==
                checkUser.state
            ) {
                // The user's PresenceState has changed
                emitEvent(checkUser);
                didUpdate = true;
            }
        }
        if (!isNewUser) return didUpdate;

        // Insert new user and send change event
        const newUser = new LivePresenceUser<TData>(
            info,
            evt,
            this._expirationPeriod,
            this.liveRuntime,
            localEvent
        );
        this._users.push(newUser);
        emitEvent(newUser);
        return true;
    }
}

/**
 * Register `LivePresence` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LivePresence, LivePresence.TypeName);
