/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    DataObjectFactory,
    createDataObjectKind,
} from "@fluidframework/aqueduct/internal";
import { IEvent } from "@fluidframework/core-interfaces";
import {
    LivePresenceUser,
    PresenceStatus,
    ILivePresenceEvent,
    LivePresenceReceivedEventData,
} from "./LivePresenceUser.js";
import { LiveObjectSynchronizer } from "./internals/LiveObjectSynchronizer.js";
import { LiveTelemetryLogger } from "./LiveTelemetryLogger.js";
import {
    LiveDataObjectInitializeNotNeededError,
    LiveDataObjectNotInitializedError,
    UnexpectedError,
} from "./errors.js";
import { TimeInterval } from "./TimeInterval.js";
import { DynamicObjectRegistry } from "./internals/DynamicObjectRegistry.js";
import {
    IClientInfo,
    LiveDataObjectInitializeState,
    UserMeetingRole,
} from "./interfaces.js";
import { LiveDataObject } from "./internals/LiveDataObject.js";
import { SharedObjectKind } from "fluid-framework";
import { cloneValue } from "./internals/utils.js";
import { TelemetryEvents } from "./internals/consts.js";
import { AzureMember } from "@fluidframework/azure-client";

/**
 * Valid types of custom data for a {@link LivePresence} user.
 */
export type LivePresenceData =
    | object
    | string
    | number
    | boolean
    | undefined
    | null;

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
export interface ILivePresenceEvents<TData extends LivePresenceData = any>
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
 * @template TData Type of data object to share with clients. Can be any serializable JSON value.
 */
export class LivePresenceClass<
    TData extends LivePresenceData = any,
> extends LiveDataObject<{
    Events: ILivePresenceEvents<TData>;
}> {
    private _logger?: LiveTelemetryLogger;
    private _expirationPeriod = new TimeInterval(20000);
    private _users: LivePresenceUser<TData>[] = [];
    private _lastEmitPresenceStateMap = new Map<string, PresenceStatus>();
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
        LivePresenceClass.TypeName,
        LivePresenceClass,
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
     * Local {@link LivePresenceUser}.
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
     * @param data Custom data object to share for local user. A deep copy of the data object is saved to avoid any accidental modifications.
     * @param allowedRoles Optional. List of roles allowed to emit presence changes.
     *
     * @returns a void promise that resolves once complete.
     *
     * @throws error when `.initialize()` has already been called for this class instance.
     * @throws fatal error when `.initialize()` has already been called for an object of same id but with a different class instance.
     * This is most common when using dynamic objects through Fluid.
     * @example
     ```ts
        import { LiveShareClient, LivePresence, LivePresenceUser } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";

        // Join the Fluid container and create the LivePresence instance
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        const presence = await client.getDDS("unique-id", LivePresence<boolean>);
        
        // Listen for changes to presence prior to calling initialize
        presence.on("presenceChanged", async (user: LivePresenceUser<boolean>, local: boolean) => {
            console.log(user);
        });
        // Initialize LivePresence with initial presence data for local user
        await presence.initialize(true);
        // Update presence after calling initialize
        await presence.update(false);
     ```
     */
    public async initialize(
        data: TData,
        allowedRoles?: UserMeetingRole[]
    ): Promise<void> {
        LiveDataObjectInitializeNotNeededError.assert(
            "LivePresence:initialize",
            this.initializeState
        );
        // This error should not happen due to `initializeState` enum, but if it is somehow defined at this point, errors will occur.
        UnexpectedError.assert(
            !this._synchronizer,
            "LivePresence:initialize",
            "_synchronizer already set, which is an unexpected error."
        );

        this.listenForAudienceMemberChanges();

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
                status: PresenceStatus.online,
                data,
            },
        };

        // Create object synchronizer
        this._synchronizer = new LiveObjectSynchronizer<
            ILivePresenceEvent<TData>
        >(this.id, this.runtime, this.liveRuntime);
        try {
            await this._synchronizer!.start({
                initialState: this._currentPresence!.data,
                updateState: async (state, sender, local) => {
                    // Add user to list
                    await this.updateMembersList(state, local);
                    return false;
                },
                getLocalUserCanSend: async (connecting) => {
                    if (connecting) return true;
                    // If user has eligible roles, allow the update to be sent
                    try {
                        return await this.verifyLocalUserRoles();
                    } catch {
                        return false;
                    }
                },
                shouldUpdateTimestampPeriodically: true, // We want to update the timestamp periodically so that we know if a user is active
            });
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
            true,
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
        this.disposeAudienceMemberChanges();
    }

    /**
     * Returns a snapshot of the current list of presence objects being tracked.
     * See {@link LivePresenceUser}
     * @param filter Optional. Presence status to filter enumeration to.
     * @returns Array of presence objects.
     *
     * @example
     ```ts
        import { LiveShareClient, LivePresence, PresenceStatus } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";

        // Join the Fluid container and create the LivePresence instance
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        const presence = await client.getDDS("unique-id", LivePresence<null>);
        // Initialize LivePresence
        await presence.initialize(null);

        // Get online users
        const onlineUsers = presence.getUsers(PresenceStatus.online);

        // Get all users
        const allUsers = presence.getUsers();
     ```
     */
    public getUsers(filter?: PresenceStatus): LivePresenceUser<TData>[] {
        if (!filter) return this._users;
        return this._users.filter((user) => user.status == filter);
    }

    /**
     * Updates the local user's presence shared data object.
     *
     * @remarks
     * This will trigger the immediate broadcast of the users presence to all other clients.
     *
     * @param data Data object to change. A deep copy of the data object is saved to avoid any future changes.
     *
     * @returns a void promise that resolves once the update event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles defined through the `allowedRoles` prop in `.initialize()`.
     * 
     * @example
     ```ts
        import { LiveShareClient, LivePresence, LivePresenceUser } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";

        // Delcare interface for custom presence data
        interface IPresenceData {
            favoriteColor: string;
        }

        // Join the Fluid container and create the LivePresence instance
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        const presence = await client.getDDS("unique-id", LivePresence<IPresenceData>);
        
        // Listen for changes to presence prior to calling initialize
        presence.on("presenceChanged", async (user: LivePresenceUser<IPresenceData>, local: boolean) => {
            console.log(user);
        });
        // Initialize LivePresence with initial presence data for local user
        await presence.initialize({ favoriteColor: "red" });
        // Update presence after calling initialize
        await presence.update({ favoriteColor: "blue" });
     ```
     */
    public async update(data: TData): Promise<void> {
        return await this.updateInternal(data);
    }

    /**
     * Returns the current presence info for a specific client ID.
     * See {@link LivePresenceUser}
     * @param clientId The ID of the client to retrieve.
     * @returns The current presence information for the client if they've connected to the space.
     * 
     * @example
     * Using this function, `LivePresence` can easily integrate with other Live Share features.
     ```ts
        import { LiveShareClient, LiveState, LivePresence } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";

        // Join the Fluid container and create the DDS instances
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        const presence = await client.getDDS("unique-id-1", LivePresence<null>);
        const counter = await client.getDDS("unique-id-2", LiveState<number>);

        // Initialize LivePresence
        await presence.initialize(null);

        // Listen for changes to LiveState and get presence object for user that made change
        counter.on("stateChanged", (count: number, local: boolean, clientId: string) => {
            const user = presence.getUserForClient(clientId);
            console.log("user", user, "changed the count to", count);
        });
        // Initialize counter LiveState instance
        await counter.initialize(0);
     ```
     */
    public getUserForClient(
        clientId: string
    ): LivePresenceUser<TData> | undefined {
        return this._users.find((user) => user.isFromClient(clientId));
    }

    /**
     * Returns the current presence info for a specific user.
     * See {@link LivePresenceUser}
     * @param userId The ID of the user to retrieve.
     * @returns The current presence information for the user if they've connected to the space.
     * @example
     * Using this function, `LivePresence` can easily integrate with other Teams features, such as Microsoft Graph.
     ```ts
        import { LiveShareClient, LiveState, LivePresence } from "@microsoft/live-share";
        import { LiveShareHost } from "@microsoft/teams-js";

        // Join the Fluid container, create LivePresence, and initialize it
        const host = LiveShareHost.create();
        const client = new LiveShareClient(host);
        await client.join();
        const presence = await client.getDDS("unique-id", LivePresence<null>);
        await presence.initialize(null);

        // Get the user by user id
        const user = presence.getUser("some-teams-user-id");
     ```
     */
    public getUser(userId: string): LivePresenceUser<TData> | undefined {
        return this._users.find((user) => user.userId == userId);
    }

    /**
     * Internal method to send an update, with optional ability to throttle.
     */
    private async updateInternal(
        data: TData | undefined,
        throttle: boolean = false,
        background: boolean = false
    ): Promise<void> {
        LiveDataObjectNotInitializedError.assert(
            "LivePresence:updateInternal",
            "update", // this is used to tell developer info about error / how to fix, so we use public signature
            this.initializeState
        );
        UnexpectedError.assert(
            !!this._synchronizer,
            "LivePresence:updateInternal",
            "this._synchronizer is undefined, implying there was an error during initialization that should not occur."
        );
        UnexpectedError.assert(
            !!this._currentPresence,
            "LivePresence:updateInternal",
            "this._currentPresence is undefined, implying there was an error during initialization that should not occur."
        );

        // Broadcast state change
        const evtToSend = {
            status: this._currentPresence.data.status,
            data: cloneValue(data) ?? this._currentPresence.data.data,
        };

        if (!background || this.liveRuntime.canSendBackgroundUpdates) {
            const evt = throttle
                ? await this._synchronizer!.sendThrottledEvent(evtToSend)
                : await this._synchronizer!.sendEvent(evtToSend);

            await this.updateMembersList(evt, true);
        } else {
            /*
             * If canSendBackgroundUpdates is false,
             * local user should be able to keep track of local user state.
             *
             * Create an event that is not sent to other clients, but allows
             * local user state to be created.
             */
            const localOnlyEvent = {
                data: evtToSend,
                name: "UpdatePresence",
                clientId: await this.waitUntilConnected(),
                timestamp: this.liveRuntime.getTimestamp(),
            };
            await this.updateMembersList(localOnlyEvent, true);
        }
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

            return this.updateMembersListWithInfo(evt, localEvent, info);
        } catch (err) {
            this._logger?.sendErrorEvent(
                TelemetryEvents.LiveState.RoleVerificationError,
                err
            );
        }
        return false;
    }

    private updateMembersListWithInfo(
        evt: LivePresenceReceivedEventData<TData>,
        localEvent: boolean,
        info: IClientInfo
    ): boolean {
        const emitEvent = (user: LivePresenceUser<TData>) => {
            this._lastEmitPresenceStateMap.set(user.userId, user.status);
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
                checkUser.status
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

    private audienceCallbacks = {
        memberAdded: async (clientId: string, member: AzureMember<any>) => {
            this.audienceMemberChanged(clientId, PresenceStatus.online);
        },
        memberRemoved: async (clientId: string, member: AzureMember<any>) => {
            this.audienceMemberChanged(clientId, PresenceStatus.offline);
        },
    };

    private listenForAudienceMemberChanges() {
        this.liveRuntime.audience?.on(
            "memberAdded",
            this.audienceCallbacks.memberAdded
        );

        this.liveRuntime.audience?.on(
            "memberRemoved",
            this.audienceCallbacks.memberRemoved
        );
    }

    private disposeAudienceMemberChanges() {
        this.liveRuntime.audience?.off(
            "memberAdded",
            this.audienceCallbacks.memberAdded
        );

        this.liveRuntime.audience?.off(
            "memberRemoved",
            this.audienceCallbacks.memberRemoved
        );
    }

    /**
     * Will not create new Presence Users but will update to online if they leave and come back, and offline when they leave.
     */
    private async audienceMemberChanged(
        clientId: string,
        status: PresenceStatus
    ) {
        const user = this.getUserForClient(clientId);
        if (!user) {
            return;
        }
        const connection = user?.getConnection(clientId);
        if (!connection) return;

        const evtToSend = {
            status,
            data: connection.data,
        };
        /**
         * Create an event that is not sent to other clients, since all clients should create this event at the same time.
         */
        const localOnlyEvent = {
            data: evtToSend,
            name: "UpdatePresence",
            clientId: clientId,
            timestamp: this.liveRuntime.getTimestamp(),
        };
        await this.updateMembersList(localOnlyEvent, true);
    }
}

export type LivePresence<TData extends LivePresenceData = any> =
    LivePresenceClass<TData>;

// eslint-disable-next-line no-redeclare
export const LivePresence = (() => {
    const kind = createDataObjectKind(LivePresenceClass<any>);
    return kind as typeof kind & SharedObjectKind<LivePresenceClass<any>>;
})();

/**
 * Register `LivePresence` as an available `SharedObjectKind` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(LivePresence, LivePresence.TypeName);
