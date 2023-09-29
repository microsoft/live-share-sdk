import { LiveDataObject } from "./LiveDataObject";
import { LiveState } from "./LiveState";
import { ILivePresenceEvents, LivePresence } from "./LivePresence";
import { DataObjectFactory } from "@fluidframework/aqueduct";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { assert } from "@fluidframework/common-utils";
import { LiveDataObjectInitializeState, UserMeetingRole } from "./interfaces";
import { LiveTelemetryLogger } from "./LiveTelemetryLogger";
import { LivePresenceUser, PresenceState } from "./LivePresenceUser";
import { DynamicObjectRegistry } from "./DynamicObjectRegistry";

/**
 * @beta
 *
 * Events supported by `LiveFollowMode` object.
 */
export enum LiveFollowModeEvents {
    /**
     * The follow mode state changed.
     */
    stateChanged = "stateChanged",
    /**
     * A user's presence state changed.
     */
    presenceChanged = "presenceChanged",
}

/**
 * @beta
 *
 * Event typings for `LiveFollowMode` class.
 * @template TData Type of data object to share with clients.
 */
export interface ILiveFollowModeEvents<TData = any>
    extends ILivePresenceEvents<IFollowModePresenceUserData<TData>> {
    /**
     * The presence information for the local or a remote user has changed.
     * @param event Name of event.
     * @param listener Function called when event is triggered.
     * @param listener.state Follow mode state.
     * @param listener.local If true the local client initiated this state change.
     * @param listener.clientId The client ID for the user that triggered this message.
     */
    (
        event: "stateChanged",
        listener: (
            state: IFollowModeState<TData>,
            local: boolean,
            clientId: string
        ) => void
    ): any;
}

/**
 * @beta
 *
 * The follow mode type.
 *
 * @remarks
 * Determines which user's `stateValue` is being referenced by `LiveFollowMode`'s `state.value` field.
 * Use to tell the user the current state of follow mode (e.g., "You are actively presenting").
 * Use to determine any relevant button(s) to show to the user (e.g., "Stop presenting").
 */
export enum FollowModeType {
    /**
     * Local user is not following anyone, there is no presenter, and nobody is following them.
     */
    local = "local",
    /**
     * Local user is being followed by other remote users.
     */
    activeFollowers = "activeFollowers",
    /**
     * Local user is actively presenting to other users.
     */
    activePresenter = "activePresenter",
    /**
     * Local user is following the presenter and is in sync.
     */
    followPresenter = "followPresenter",
    /**
     * The local user is suspended from the remote active presenter.
     */
    suspendFollowPresenter = "suspendFollowPresenter",
    /**
     * Local user is following a specific user and is in sync.
     */
    followUser = "followUser",
    /**
     * The local user is suspended from following a specific user.
     */
    suspendFollowUser = "suspendFollowUser",
}

/**
 * @beta
 *
 * Information about the state of the local user's follow mode.
 *
 * @remarks
 * This includes information such as whether there is a presenting user and which user's state is relevant to the local user.
 */
export interface IFollowModeState<TData = any> {
    /**
     * The follow mode type for the local user.
     *
     * @remarks
     * Determines which user's {@link IFollowModePresenceUserData["stateValue"]} to use for {@link value}.
     * Calculated using a combination of different conditions, such as whether there is an active presenter.
     */
    type: FollowModeType;
    /**
     * The custom value the app should use locally to reflect the follow state.
     *
     * @remarks
     * The relevant user's {@link IFollowModePresenceUserData["stateValue"]}, as determined by {@link type}.
     * For example, if `FollowModeType` is `activePresenter`, this value will be the actively presenting user's `stateValue`.
     */
    value: TData;
    /**
     * The userId of the user that the user is following.
     * This value can be either the presenting user or a specific user the local user is following.
     *
     * @remarks
     * Is a string when {@link type} is `followPresenter`, `suspendFollowPresenter`, `followUser`, or `suspendFollowUser`.
     * Is undefined when {@link type} is `local` or `activePresenter`.
     * Presenting takes precedence over following a specific user.
     */
    followingUserId: string;
    /**
     * Number of other non-local users following along with this current state value
     */
    otherUsersCount: number;
    /**
     * Indicates that is true when the {@link value} is referencing the local user's {@link IFollowModePresenceUserData["stateValue"]}.
     *
     * @remarks
     * When true, {@link followingUserId} may not be the local user's id when {@link type} is `suspendFollowUser` or `suspendFollowPresenter`.
     */
    isLocalValue: boolean;
}

/**
 * @beta
 *
 * The presence data for a user's personal follow mode state.
 */
export interface IFollowModePresenceUserData<TData = any> {
    /**
     * User's personal state
     */
    stateValue: TData;
    /**
     * The user that this user is following.
     *
     * @remarks
     * This will be ignored when `LiveFollowMode["presentingUserIdState"]` is set.
     */
    followingUserId: string | undefined;
}

/**
 * @beta
 *
 * Convenience type for a LivePresenceUser in LiveFollowMode
 */
export type FollowModePresenceUser<TData = any> = LivePresenceUser<
    IFollowModePresenceUserData<TData>
>;

const presentingUserIdLiveStateKey = "<<presentingUserIdLiveStateKey>>";
const livePresenceKey = "<<livePresenceKey>>";

/**
 * @beta
 *
 * Live object that allows users to present and/or follow other users.
 * Provides a {@link state} value, which reflects the relevant value to reference (e.g., the presenting user's state value).
 *
 * @template TData Type of data value to share with clients for each user (e.g., the user's camera position in a 3D scene).
 */
export class LiveFollowMode<TData = any> extends LiveDataObject<{
    Events: ILiveFollowModeEvents<TData>;
}> {
    private _logger?: LiveTelemetryLogger;
    /**
     * The synchronized userId of a user that is in control of presenting
     */
    private _presentingUserIdState?: LiveState<string | undefined>;
    /**
     * Flag for whether the local user is out of sync with the person they are following.
     * Defaults to false, even if the user is not following anyone.
     */
    private _suspended: boolean = false;
    /**
     * The `LivePresence` instance for tracking each user's state
     */
    private _presence?: LivePresence<IFollowModePresenceUserData<TData>>;
    /**
     * The most recent emitted follow state
     */
    private _recentState?: IFollowModeState<TData> | undefined;

    /**
     * The objects fluid type/name.
     */
    public static readonly TypeName = `@microsoft/live-share:LiveFollowMode`;

    /**
     * The objects fluid type factory.
     */
    public static readonly factory = new DataObjectFactory(
        LiveFollowMode.TypeName,
        LiveFollowMode,
        [],
        {},
        new Map<string, Promise<any>>([
            LiveState.factory.registryEntry,
            LivePresence.factory.registryEntry,
        ])
    );

    /**
     * Gets the current follow mode state.
     *
     * @remarks
     * Value is {@link IFollowModeState} when follow mode state is ready to access, and undefined when pending.
     */
    public get state(): IFollowModeState<TData> | undefined {
        const localUser = this.presence.localUser;
        if (!localUser || !localUser.data) {
            return undefined;
        }
        const presentingUser = this.presentingUserIdState.state
            ? this.presence.getUser(this.presentingUserIdState.state)
            : undefined;
        if (presentingUser && presentingUser.data) {
            // Count is all online users minus the presenting user
            const otherUsersCount =
                this.getUsers(PresenceState.online).length - 1;
            if (presentingUser.isLocalUser) {
                // The local user is the presenter
                return {
                    value: presentingUser.data.stateValue,
                    followingUserId: presentingUser.userId,
                    type: FollowModeType.activePresenter,
                    otherUsersCount,
                    isLocalValue: true,
                };
            }
            if (this._suspended) {
                // There is a presenting user but the local user is suspended
                return {
                    value: localUser.data.stateValue,
                    followingUserId: presentingUser.userId,
                    type: FollowModeType.suspendFollowPresenter,
                    otherUsersCount: otherUsersCount - 1,
                    isLocalValue: true,
                };
            }
            // There is a presenting user and the local user is in sync
            return {
                value: presentingUser.data.stateValue,
                followingUserId: presentingUser.userId,
                type: FollowModeType.followPresenter,
                // don't want to count the local user in otherUsersCount
                otherUsersCount: otherUsersCount - 1,
                isLocalValue: false,
            };
        }
        const followingUser = localUser.data.followingUserId
            ? this.presence.getUser(localUser.data.followingUserId)
            : undefined;
        if (followingUser && followingUser.data) {
            const otherUsersCount =
                this.getUserFollowers(
                    followingUser.userId,
                    PresenceState.online
                ).length - 1;
            if (this._suspended) {
                // Local user is following specific user but is suspended
                return {
                    value: localUser.data.stateValue,
                    followingUserId: followingUser.userId,
                    type: FollowModeType.suspendFollowUser,
                    otherUsersCount,
                    isLocalValue: true,
                };
            }
            // Local user is following a specific user and is in sync
            return {
                value: followingUser.data.stateValue,
                followingUserId: followingUser.userId,
                type: FollowModeType.followUser,
                otherUsersCount,
                isLocalValue: false,
            };
        }

        const userCountFollowingLocalUser = this.getUserFollowers(
            localUser.userId,
            PresenceState.online
        ).length;
        if (userCountFollowingLocalUser > 0) {
            // User is being followed by other users
            return {
                value: localUser.data.stateValue,
                followingUserId: localUser.userId,
                type: FollowModeType.activeFollowers,
                otherUsersCount: userCountFollowingLocalUser,
                isLocalValue: true,
            };
        }
        // User is not following anyone and nobody is presenting
        return {
            value: localUser.data.stateValue,
            followingUserId: localUser.userId,
            type: FollowModeType.local,
            otherUsersCount: this.getUserFollowers(
                localUser.userId,
                PresenceState.online
            ).length,
            isLocalValue: true,
        };
    }

    /**
     * Local LivePresenceUser.
     * Can be undefined before LiveFollowMode is initialized.
     */
    public get localUser(): FollowModePresenceUser<TData> | undefined {
        return this.presence.localUser;
    }

    /**
     * Convenience getter to get the `_dynamicObjectsCollection` without having to check for undefined, since this will
     * never be undefined after `initializingFirstTime`.
     */
    private get presentingUserIdState() {
        assert(
            this._presentingUserIdState !== undefined,
            "_presentingUserIdState not initialized"
        );
        return this._presentingUserIdState;
    }

    /**
     * Convenience getter to get the `_dynamicObjectsCollection` without having to check for undefined, since this will
     * never be undefined after `initializingFirstTime`.
     */
    private get presence() {
        assert(this._presence !== undefined, "_presence not initialized");
        return this._presence;
    }

    /**
     * Initialize the object to begin sending/receiving state updates through this DDS.
     *
     * @param initialState Initial state value
     * @param allowedRoles Optional. List of roles allowed to make state changes.
     *
     * @returns a void promise that resolves once complete
     *
     * @throws error when `.initialize()` has already been called for this class instance.
     * @throws fatal error when `.initialize()` has already been called for an object of same id but with a different class instance.
     * This is most common when using dynamic objects through Fluid.
     */
    public async initialize(
        initialState: TData,
        allowedRoles?: UserMeetingRole[]
    ): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.needed) {
            throw new Error(`LiveFollowMode already started.`);
        }
        // Update initialize state as pending
        this.initializeState = LiveDataObjectInitializeState.pending;
        this._logger = new LiveTelemetryLogger(this.runtime, this.liveRuntime);

        this.presentingUserIdState.on(
            "stateChanged",
            (state, local, clientId) => {
                // Reset out of sync flag whenever the following user changes
                this._suspended = false;
                this.handlePotentialStateChange(local, clientId);
            }
        );
        this.presence.on("presenceChanged", (user, local, clientId) => {
            this.handlePotentialStateChange(local, clientId);
            // Emit presenceChanged event
            this.emit("presenceChanged", user, local, clientId);
        });
        try {
            await Promise.all([
                this.presentingUserIdState.initialize(undefined, allowedRoles),
                this.presence.initialize({
                    stateValue: initialState,
                    followingUserId: undefined,
                }),
            ]);
        } catch (error: unknown) {
            // Update state as fatal
            this.initializeState = LiveDataObjectInitializeState.fatalError;
            throw error;
        }

        // Update initialize state as succeeded
        this.initializeState = LiveDataObjectInitializeState.succeeded;
    }

    /**
     * Broadcast a new custom data value for the local user's current state.
     *
     * @remarks
     * Each user has their own state value, though it will differ from what is shown in {@link state} depending on the value of {@link FollowModeType}.
     * Will cause the user to become out of sync if another user is presenting or the local user is following another user.
     * To see each user's state, use the {@link getUsers} API, or listen to "presenceChanged" updates.
     *
     * @param newValue the state value for the local user's presence record.
     *
     * @returns a void promise that resolves once the update event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     */
    public async update(newValue: TData): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveFollowMode: not initialized prior to calling \`.update()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this.presence.localUser?.data) {
            throw new Error(
                `LiveFollowMode: invalid local user's current state value when calling \`.followUser()\`, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        // Send the new stateValue through presence
        await this.presence.update({
            stateValue: newValue,
            followingUserId: this.presence.localUser.data.followingUserId,
        });
    }

    /**
     * Start presenting the local user's state.
     *
     * @remarks
     * If another user is already presenting, the local user will take control of presenting from the previous presenter.
     * To update the local user's state that both the local and remote users will reference, use the {@link update} function.
     * This API will override any `followingUserId` value that was set through {@link followUser} until presenting has stopped.
     * To stop presenting, use the {@link stopPresenting} API.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user is already the presenter.
     * @throws error if the local user does not have the required roles to present.
     */
    public async startPresenting(): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveFollowMode: not initialized prior to calling \`.followUser()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this.presence.localUser?.data) {
            throw new Error(
                `LiveFollowMode: invalid local user's current state value when calling \`.followUser()\`, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        if (
            this.presence.localUser.userId === this.presentingUserIdState.state
        ) {
            throw new Error(
                `LiveFollowMode: the local user is already the active presenter. To stop presenting, use the \`.stopPresenting()\` function.`
            );
        }
        // Set presentingUserIdState to the local user's userId
        await this.presentingUserIdState.set(this.presence.localUser.userId);
    }

    /**
     * Stop presenting the presenting user's current state.
     *
     * @remarks
     * This API allows any user with valid roles to cancel presenting, though we generally recommend only allowing the active presenter to do so.
     * To start presenting, use the {@link startPresenting} API.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the local user does not have the required roles to stop presenting.
     */
    public async stopPresenting(): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveFollowMode: not initialized prior to calling \`.followUser()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this.presence.localUser?.data) {
            throw new Error(
                `LiveFollowMode: invalid local user's current state value when calling \`.followUser()\`, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        // Set presentingUserIdState to undefined
        await this.presentingUserIdState.set(undefined);
    }

    /**
     * Temporarily stop following presenter/follower.
     *
     * @returns a void promise once the operation succeeds.
     *
     * @throws error if initialization has not yet succeeded.
     */
    public async beginSuspension(): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveFollowMode: not initialized prior to calling \`.followUser()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this.presence.localUser?.data) {
            throw new Error(
                `LiveFollowMode: invalid local user's current state value when calling \`.followUser()\`, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        this._suspended = true;
        this.handlePotentialStateChange(true, await this.waitUntilConnected());
    }

    /**
     * Resume following presenter/follower.
     *
     * @returns a void promise once the operation succeeds.
     *
     * @throws error if initialization has not yet succeeded.
     */
    public async endSuspension(): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveFollowMode: not initialized prior to calling \`.followUser()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this.presence.localUser?.data) {
            throw new Error(
                `LiveFollowMode: invalid local user's current state value when calling \`.followUser()\`, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        this._suspended = false;
        this.handlePotentialStateChange(true, await this.waitUntilConnected());
    }

    /**
     * Follows another user in the session.
     *
     * @remarks
     * If another user is presenting, {@link state} will not reflect following this user until there is no longer a presenter.
     *
     * @param userId the userId for the user to follow.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if attempting to follow a user that is not recognized by this object's `LivePresence` instance.
     * @throws error if the `userId` provided is equal to the local user's `userId`.
     */
    public async followUser(userId: string): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveFollowMode: not initialized prior to calling \`.followUser()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this.presence.localUser?.data) {
            throw new Error(
                `LiveFollowMode: invalid local user's current state value when calling \`.followUser()\`, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        const user = this.presence.getUser(userId);
        if (!user) {
            throw new Error(
                `LiveFollowMode: cannot find user for provided \`userId\` of ${userId}. Ensure remote user for this userId has also called \`.initialize()\`.`
            );
        }
        if (user.isLocalUser) {
            throw new Error(
                "LiveFollowMode: local user cannot follow themselves. If you are trying to stop following another user, instead use the `.stopFollowing()` function."
            );
        }
        // Update followingUserId for presence
        await this.presence.update({
            stateValue: this.presence.localUser.data.stateValue,
            followingUserId: userId,
        });
    }

    /**
     * Stop following the currently following user.
     *
     * @returns a void promise that resolves once the event has been sent to the server.
     *
     * @throws error if initialization has not yet succeeded.
     * @throws error if the user is not already following another user.
     */
    public async stopFollowing(): Promise<void> {
        if (this.initializeState !== LiveDataObjectInitializeState.succeeded) {
            throw new Error(
                `LiveFollowMode: not initialized prior to calling \`.stopFollowing()\`. \`initializeState\` is \`${this.initializeState}\` but should be \`succeeded\`.\nTo fix this error, ensure \`.initialize()\` has resolved before calling this function.`
            );
        }
        if (!this.presence.localUser?.data) {
            throw new Error(
                `LiveFollowMode: invalid local user's current state value when calling \`.stopFollowing()\`, implying there was an error during initialization that should not occur. Please report this issue at https://aka.ms/teamsliveshare/issue.`
            );
        }
        if (!this.presence.localUser.data.followingUserId) {
            throw new Error(
                `LiveFollowMode: the local user is not following another user.\nTo fix this error, ensure that \`.followUser()\` has resolved before calling this function.`
            );
        }
        // Update followingUserId for presence
        await this.presence.update({
            stateValue: this.presence.localUser.data.stateValue,
            followingUserId: undefined,
        });
    }

    /**
     * Returns a snapshot of the current list of presence objects being tracked.
     * @param filter Optional. Presence state to filter enumeration to.
     * @returns Array of presence objects.
     */
    public getUsers(filter?: PresenceState): FollowModePresenceUser<TData>[] {
        return this.presence.getUsers(filter);
    }

    /**
     * Returns the current presence info for a specific user.
     * @param userId The ID of the user to retrieve.
     * @returns The current presence information for the user if they've connected to the space.
     */
    public getUser(userId: string): FollowModePresenceUser<TData> | undefined {
        return this.presence.getUser(userId);
    }

    /**
     * Returns the current presence info for a specific client ID.
     * @param clientId The ID of the client to retrieve.
     * @returns The current presence information for the client if they've connected to the space.
     */
    public getUserForClient(
        clientId: string
    ): FollowModePresenceUser<TData> | undefined {
        return this.presence.getUserForClient(clientId);
    }

    /**
     * Get the users that are following a given userId.
     *
     * @param userId the userId of the person being followed.
     * @param stateFilter the presence state to filter results by.
     */
    public getUserFollowers(
        userId: string,
        stateFilter?: PresenceState
    ): FollowModePresenceUser<TData>[] {
        const users = this.getUsers(stateFilter);
        return users.filter((user) => user.data?.followingUserId === userId);
    }

    /**
     * Disposes of the object when its container is disposed of.
     */
    public dispose(): void {
        super.dispose();
        this.presence.dispose();
        this.presentingUserIdState.dispose();
    }

    /**
     * initializingFirstTime is run only once by the first client to create the DataObject. Here we use it to
     * initialize the state of the DataObject.
     */
    protected async initializingFirstTime() {
        // We create the live state instance
        const presentingUserIdLiveStatePromise =
            LiveState.factory.createChildInstance(this.context);
        // We create the live state instance
        const livePresencePromise = LivePresence.factory.createChildInstance(
            this.context
        );
        try {
            const [presentingUserLiveState, livePresence] = await Promise.all([
                presentingUserIdLiveStatePromise,
                livePresencePromise,
            ]);
            // Set object(s) to root
            this.root.set(
                presentingUserIdLiveStateKey,
                presentingUserLiveState.handle
            );
            this.root.set(livePresenceKey, livePresence.handle);
        } catch (err: unknown) {
            console.log(err);
        }
    }

    /**
     * hasInitialized is run by each client as they load the DataObject.  Here we use it to initialize the
     * task manager, listen for task assignments, and listen for changes to the dynamic objects map.
     */
    protected async hasInitialized() {
        // Get object handles
        const presentingUserIdLiveStateHandle = this.root.get<
            IFluidHandle<LiveState>
        >(presentingUserIdLiveStateKey);
        const presenceHandle =
            this.root.get<IFluidHandle<LivePresence>>(livePresenceKey);
        const [liveState, livePresence] = await Promise.all([
            presentingUserIdLiveStateHandle?.get(),
            presenceHandle?.get(),
        ]);
        liveState?.__dangerouslySetLiveRuntime(this.liveRuntime);
        livePresence?.__dangerouslySetLiveRuntime(this.liveRuntime);
        this._presentingUserIdState = liveState;
        this._presence = livePresence as LivePresence<
            IFollowModePresenceUserData<TData>
        >;
    }

    /**
     * Checks if the state has changed since we last checked, and if so, emits change.
     */
    private handlePotentialStateChange(local: boolean, clientId: string) {
        const newState = this.state;
        if (JSON.stringify(newState) === JSON.stringify(this._recentState)) {
            return;
        }
        this._recentState = newState;
        this.emit("stateChanged", newState, local, clientId);
    }
}

/**
 * Register `LiveFollowMode` as an available `LoadableObjectClass` for use in packages that support dynamic object loading, such as `@microsoft/live-share-turbo`.
 */
DynamicObjectRegistry.registerObjectClass(
    LiveFollowMode,
    LiveFollowMode.TypeName
);
