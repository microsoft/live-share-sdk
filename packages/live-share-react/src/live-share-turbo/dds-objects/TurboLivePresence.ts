import {
    ILivePresenceEvents,
    LivePresence,
    LivePresenceUser,
    PresenceState,
    LivePresenceEvents,
} from "@microsoft/live-share";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { IFluidTurboClient } from "../interfaces";
import { TurboDataObject } from "./TurboDataObject";

export class TurboLivePresence<
    TData extends object = object
> extends TurboDataObject<
    ILivePresenceEvents<TData>,
    LivePresence<TData>
> {
    private _isInitialized: boolean = false;
    private _userId?: string;
    private _data?: TData;
    private _state?: PresenceState;

    constructor(dataObject: LivePresence<TData>) {
        const onDidOverrideDataObject = async () => {
            if (this._isInitialized) {
                try {
                    await this.dataObject.initialize(
                        this._userId,
                        this._data,
                        this._state
                    );
                } catch (error: any) {
                    console.error(error);
                }
            }
        };
        super(dataObject, Object.keys(LivePresenceEvents), onDidOverrideDataObject);
    }

    public get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Number of seconds without a presence update before a remote user is considered offline.
     *
     * @remarks
     * Defaults to a value of `20` seconds. The minimum value is 0.1 seconds for testing purposes.
     */
    public get expirationPeriod(): number {
        return this.dataObject.expirationPeriod;
    }

    public set expirationPeriod(value: number) {
        this.dataObject.expirationPeriod = value;
    }

    /**
     * Optional data object shared by the user.
     */
    public get data(): TData | undefined {
        return this.dataObject.data;
    }

    /**
     * The users current presence state.
     */
    public get state(): PresenceState {
        return this.dataObject.state;
    }

    /**
     * Returns the ID of the local user.
     */
    public get userId(): string {
        return this.dataObject.userId;
    }

    /**
     * initialize the object.
     * @param allowedRoles Optional. List of roles allowed to send events.
     */
    public async initialize(
        userId?: string,
        data?: TData,
        state = PresenceState.online
    ): Promise<void> {
        await this.dataObject.initialize(userId, data, state);
        this._userId = userId;
        this._data = data;
        this._state = state;
        this._isInitialized = true;
    }

    /**
     * Returns a snapshot of the current list of presence objects being tracked.
     * @returns Array of presence objects.
     */
    public toArray(): LivePresenceUser<TData>[] {
        return this.dataObject.toArray();
    }

    /**
     * Updates the users presence state and/or shared data object.
     *
     * @remarks
     * This will trigger the immediate broadcast of the users presence to all other clients.
     * @param state Optional. Presence state to change.
     * @param data Optional. Data object to change. A deep copy of the data object is saved to avoid any future changes.
     */
    public updatePresence(state?: PresenceState, data?: TData): void {
        return this.dataObject.updatePresence(state, data);
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
        return this.dataObject.forEach(callback, filter);
    }

    /**
     * Counts the number of users that the object is tracking presence for.
     * @param filter Optional. Presence state to filter count to.
     * @returns Total number of other users we've seen or number of users with a given presence status.
     */
    public getCount(filter?: PresenceState): number {
        return this.dataObject.getCount(filter);
    }

    /**
     * Returns the current presence info for a specific client ID.
     * @param clientId The ID of the client to retrieve.
     * @returns The current presence information for the client if they've connected to the space.
     */
    public getPresenceForClient(
        clientId: string
    ): LivePresenceUser<TData> | undefined {
        return this.dataObject.getPresenceForClient(clientId);
    }

    /**
     * Returns the current presence info for a specific user.
     * @param userId The ID of the user to retrieve.
     * @returns The current presence information for the user if they've connected to the space.
     */
    public getPresenceForUser(
        userId: string
    ): LivePresenceUser<TData> | undefined {
        return this.dataObject.getPresenceForUser(userId);
    }

    public static async create<TData extends object = object>(
        turboClient: IFluidTurboClient,
        uniqueKey: string,
        onDidFirstInitialize?: (dds: TurboLivePresence<TData>) => void
    ): Promise<TurboLivePresence<TData>> {
        const results = await turboClient.getDDS<
            ILivePresenceEvents<TData>,
            LivePresence<TData>
        >(
            `<LivePresence>:${uniqueKey}`,
            LivePresence<TData>,
            (dds: IFluidLoadable): TurboLivePresence<TData> => {
                return new TurboLivePresence<TData>(dds as LivePresence<TData>);
            }
        );
        const dds = results.dds as TurboLivePresence<TData>;
        if (results.created) {
            onDidFirstInitialize?.(dds);
        }
        return dds;
    }
}
