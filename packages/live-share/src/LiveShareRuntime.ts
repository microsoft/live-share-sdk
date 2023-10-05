import { assert } from "@fluidframework/common-utils";
import { HostTimestampProvider } from "./HostTimestampProvider";
import {
    IClientInfo,
    ILiveShareHost,
    IRoleVerifier,
    ITimestampProvider,
    UserMeetingRole,
    IContainerRuntimeSignaler,
} from "./interfaces";
import {
    BackwardsCompatibilityHostDecorator,
    LiveShareHostDecorator,
    RoleVerifier,
    isTimestampProvider,
    LiveObjectManager,
    FormatFixHostDecorator,
} from "./internals";
import { IAzureAudience } from "@fluidframework/azure-client";
import { ILiveShareClientOptions } from "./LiveShareClient";

/**
 * Runtime for LiveDataObject, which is used to do things like validate roles, get a timestamp
 */
export class LiveShareRuntime {
    private _started: boolean = false;
    private _host: ILiveShareHost;
    private _timestampProvider: ITimestampProvider;
    private _roleVerifier: IRoleVerifier;
    private _canSendBackgroundUpdates: boolean;
    protected _containerRuntime?: IContainerRuntimeSignaler;
    private _objectManager: LiveObjectManager | null = null;
    private _audience?: IAzureAudience;

    /**
     * Runtime for `LiveDataObject`.
     *
     * @param host Host for the current Live Share session.
     * @param options Optional. Options used for initializing `LiveShareClient`.
     * @param decorate choose whether or not to automatically decorate host with `BackwardsCompatibilityHostDecorator` and `LiveShareHostDecorator`
     */
    constructor(
        host: ILiveShareHost,
        options?: ILiveShareClientOptions,
        decorate: boolean = true
    ) {
        // BackwardsCompatibilityHostDecorator is used for backwards compatibility with older versions of the Teams client.
        // LiveShareHostDecorator is used as a thin caching layer for some host APIs.
        this._host = decorate
            ? new BackwardsCompatibilityHostDecorator(
                  new LiveShareHostDecorator(new FormatFixHostDecorator(host))
              )
            : host;
        this._timestampProvider =
            options?.timestampProvider ?? new HostTimestampProvider(this._host);
        this._roleVerifier =
            options?.roleVerifier ?? new RoleVerifier(this._host);
        this._canSendBackgroundUpdates =
            options?.canSendBackgroundUpdates ?? true;
    }

    /**
     * `LiveObjectSynchronizerManager` instance
     */
    public get objectManager(): LiveObjectManager {
        assert(
            this._objectManager !== null,
            "LiveObjectSynchronizerManager not initialized."
        );
        return this._objectManager;
    }

    /**
     * `ITimestampProvider` instance
     */
    public get timestampProvider(): ITimestampProvider {
        return this._timestampProvider;
    }

    /**
     * `ILiveShareHost` instance
     */
    public get host(): ILiveShareHost {
        return this._host;
    }

    /**
     * Setting for whether `LiveDataObject` instances using `LiveObjectSynchronizer` can send background updates.
     * Default value is `true`.
     *
     * @remarks
     * This is useful for scenarios where there are a large number of participants in a session, since service performance degrades as more socket connections are opened.
     * Intended for use when a small number of users are intended to be "in control", such as the `LiveFollowMode` class's `startPresenting()` feature.
     * There should always be at least one user in the session that has `canSendBackgroundUpdates` set to true.
     * Set to true when the user is eligible to send background updates (e.g., "in control"), or false when that user is not in control.
     * This setting will not prevent the local user from explicitly changing the state of objects using `LiveObjectSynchronizer`, such as `.set()` in `LiveState`.
     * Impacts background updates of `LiveState`, `LivePresence`, `LiveTimer`, and `LiveFollowMode`.
     */
    public get canSendBackgroundUpdates(): boolean {
        return this._canSendBackgroundUpdates;
    }

    public set canSendBackgroundUpdates(value: boolean) {
        this._canSendBackgroundUpdates = value;
    }

    /**
     * Returns the current timestamp as the number of milliseconds sine the Unix Epoch.
     */
    public getTimestamp(): number {
        return this._timestampProvider.getTimestamp();
    }

    /**
     * Verifies that a client has one of the specified roles.
     * @param clientId Client ID to inspect.
     * @param allowedRoles User roles that are allowed.
     * @returns True if the client has one of the specified roles.
     */
    public verifyRolesAllowed(
        clientId: string,
        allowedRoles: UserMeetingRole[]
    ): Promise<boolean> {
        return this._roleVerifier.verifyRolesAllowed(clientId, allowedRoles);
    }

    /**
     * Get the client info for a given clientId
     * @param clientId Fluid clientId we are requesting user info for
     * @returns IClientInfo object if the user is known, otherwise it will return undefined
     */
    public getClientInfo(clientId: string): Promise<IClientInfo | undefined> {
        return this._host.getClientInfo(clientId);
    }

    /**
     * @hidden
     * Set the timestamp provider for the runtime
     * @param timestampProvider timestamp provider to set
     */
    public setTimestampProvider(timestampProvider: ITimestampProvider) {
        this._timestampProvider = timestampProvider;
    }

    /**
     * @hidden
     * Set the role verifier for the runtime
     * @param roleVerifier role verifier to set
     */
    public setRoleVerifier(roleVerifier: IRoleVerifier) {
        this._roleVerifier = roleVerifier;
    }

    /**
     * Set the host for the runtime
     * @param host ILiveShareHost to change
     * @param decorate choose whether or not to automatically decorate host with `BackwardsCompatibilityHostDecorator` and `LiveShareHostDecorator`
     */
    public setHost(host: ILiveShareHost, decorate: boolean = true) {
        // BackwardsCompatibilityHostDecorator is used for backwards compatibility with older versions of the Teams client.
        // LiveShareHostDecorator is used as a thin caching layer for some host APIs.
        this._host = decorate
            ? new BackwardsCompatibilityHostDecorator(
                  new LiveShareHostDecorator(host)
              )
            : host;
        if (this._timestampProvider instanceof HostTimestampProvider) {
            this._timestampProvider.stop();
            this.setTimestampProvider(new HostTimestampProvider(this._host));
        }
        if (this._roleVerifier instanceof RoleVerifier) {
            this.setRoleVerifier(new RoleVerifier(this._host));
        }
    }

    /**
     * Set the audience for the runtime
     * @param audience `IAzureAudience` returned by `AzureClient`
     */
    public setAudience(audience: IAzureAudience) {
        this._audience = audience;
        this._objectManager?.setAudience(this._audience);
    }

    /**
     * Start the timestamp provider
     */
    public async start() {
        if (this._started) {
            throw new Error(
                "LiveShareRuntime.start(): cannot call start when already started"
            );
        }
        this._started = true;
        if (this._objectManager) {
            this.startObjectSynchronizerManager();
        }
        // Start provider if needed
        if (
            isTimestampProvider(this._timestampProvider) &&
            !this._timestampProvider.isRunning
        ) {
            await this._timestampProvider.start();
        }
    }

    /**
     * Stop the timestamp provider
     */
    public stop() {
        if (!this._started) {
            throw new Error(
                "LiveShareRuntime.stop(): cannot call stop when not already started"
            );
        }
        this._started = false;
        // Start provider if needed
        if (
            isTimestampProvider(this._timestampProvider) &&
            this._timestampProvider.isRunning
        ) {
            this._timestampProvider.stop();
        }
        // should not assert undefined if stopping in a unit test context
        this._objectManager?.stop();
    }

    /**
     * @hidden
     * Do not use this API unless you know what you are doing.
     * Using it incorrectly could cause object synchronizers to stop working.
     */
    public __dangerouslySetContainerRuntime(
        cRuntime: IContainerRuntimeSignaler
    ) {
        // Fluid normally will create new DDS instances with the same runtime, but during some instances they will re-instantiate it.
        if (this._containerRuntime === cRuntime) return;
        // If we already have a _containerRuntime, we technically do not need to re-set it, despite them re-instantiating it.
        // This is because for how we are using it (signals), this has no impact. We still swap out our reference and reset signal
        // event listeners, both for future proofing and as a general good memory practice to avoid unintentionally create floating references.
        this._containerRuntime = cRuntime;
        // If we already have a LiveObjectManager instance, we reset their reference to the container runtime as well
        if (this._objectManager) {
            this._objectManager.__dangerouslySetContainerRuntime(cRuntime);
            return;
        }
        this._objectManager = new LiveObjectManager(
            this,
            this._containerRuntime
        );
        this.startObjectSynchronizerManager();
    }

    /**
     * @hidden
     */
    private startObjectSynchronizerManager() {
        // If this is being set after the objectManager was started,
        this.objectManager.start();
    }
}
