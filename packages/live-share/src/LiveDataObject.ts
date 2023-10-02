import {
    DataObject,
    DataObjectTypes,
    IDataObjectProps,
} from "@fluidframework/aqueduct";
import { LiveShareRuntime } from "./LiveShareRuntime";
import { assert } from "@fluidframework/common-utils";
import {
    IClientInfo,
    LiveDataObjectInitializeState,
    UserMeetingRole,
} from "./interfaces";
import { waitUntilConnected } from "./internals";

/**
 * Extends Fluid's DataObject class. Intended for use with Live Share custom DDS's that rely on a `ILiveShareHost`.
 */
export abstract class LiveDataObject<
    I extends DataObjectTypes = DataObjectTypes
> extends DataObject<I> {
    /**
     * @hidden
     */
    public static LiveEnabled = true;

    private _initializeState: LiveDataObjectInitializeState =
        LiveDataObjectInitializeState.needed;

    /**
     * @hidden
     */
    protected _allowedRoles: UserMeetingRole[] = [];

    /**
     * @hidden
     */
    private _liveRuntime: LiveShareRuntime | null = null;

    /**
     * @internal
     * `LiveShareRuntime` instance
     * @remarks
     * You should usually not set this value to a DDS after calling `.initialize()`, but there is nothing preventing it.
     */
    protected get liveRuntime(): LiveShareRuntime {
        assert(
            this._liveRuntime !== null,
            "LiveShareRuntime not initialized. Ensure your Fluid `ContainerSchema` was first wrapped inside of `getLiveShareSchema`, or use `.joinContainer()` in `LiveShareClient`."
        );
        return this._liveRuntime;
    }

    /**
     * Flag that indicates whether initialization has succeeded or not.
     *
     * @remarks
     * This field is true when {@link initializeState} is `succeeded`, or false when {@link initializeState} is any other value.
     */
    public get isInitialized(): boolean {
        return this.initializeState === LiveDataObjectInitializeState.succeeded;
    }

    /**
     * The initialization status of the data object.
     *
     * @remarks
     * Used to know whether it is safe to call `.initialize()`
     */
    public get initializeState(): LiveDataObjectInitializeState {
        return this._initializeState;
    }

    protected set initializeState(value: LiveDataObjectInitializeState) {
        this._initializeState = value;
    }

    public constructor(props: IDataObjectProps<I>) {
        super(props);
    }

    /**
     * Get the client info for a given clientId
     * @param clientId Fluid clientId we are requesting user info for
     * @returns IClientInfo object if the user is known, otherwise it will return undefined
     */
    public getClientInfo(clientId: string): Promise<IClientInfo | undefined> {
        return this.liveRuntime.getClientInfo(clientId);
    }

    /**
     * Waits until connected and gets the most recent clientId
     * @returns clientId
     */
    protected waitUntilConnected(): Promise<string> {
        return waitUntilConnected(this.runtime);
    }

    /**
     * Verify that the user has the required roles
     * @returns boolean true if user has the required roles
     */
    protected async verifyLocalUserRoles(): Promise<boolean> {
        const clientId = await this.waitUntilConnected();
        return this.liveRuntime.verifyRolesAllowed(
            clientId,
            this._allowedRoles ?? []
        );
    }

    /**
     * @hidden
     * Dependency injection setter for `LiveShareRuntime`.
     */
    public __dangerouslySetLiveRuntime(value: LiveShareRuntime) {
        this._liveRuntime = value;
    }

    /**
     * @hidden
     * Utility function that lets you run a function if successful, or throw a consistent Error if not.
     * @param fnSuccess function to run if user has needed roles
     * @returns TResponse if successful. Should never throw an error.
     */
    public async onLocalUserAllowed(fnSuccess: () => void): Promise<void> {
        const valid = await this.verifyLocalUserRoles();
        if (!valid) return;
        fnSuccess();
    }
}
