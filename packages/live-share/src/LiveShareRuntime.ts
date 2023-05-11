import { assert } from "@fluidframework/common-utils";
import { HostTimestampProvider } from "./HostTimestampProvider";
import {
    IClientInfo,
    ILiveShareHost,
    IRoleVerifier,
    ITimestampProvider,
    UserMeetingRole,
    IContainerRuntimeSignaler
} from "./interfaces";
import {
    BackwardsCompatibilityHostDecorator,
    LiveShareHostDecorator,
    RoleVerifier,
    isTimestampProvider,
} from "./internals";
import { IAzureAudience } from "@fluidframework/azure-client";
import { LiveObjectManager } from "./LiveObjectManager";

/**
 * Runtime for LiveDataObject, which is used to do things like validate roles, get a timestamp
 */
export class LiveShareRuntime {
    private _started: boolean = false;
    private _host: ILiveShareHost;
    private _timestampProvider: ITimestampProvider;
    private _roleVerifier: IRoleVerifier;
    protected _containerRuntime?: IContainerRuntimeSignaler;
    private _objectManager: LiveObjectManager | null = null;
    private _audience?: IAzureAudience;

    /**
     *
     * @param host Host for the current Live Share session.
     * @param customTimestampProvider Optional. Custom timestamp provider to use.
     * @param customRoleVerifier Optional. Custom role verifier to use.
     * @param decorate choose whether or not to automatically decorate host with `BackwardsCompatibilityHostDecorator` and `LiveShareHostDecorator`
     */
    constructor(
        host: ILiveShareHost,
        timestampProvider?: ITimestampProvider,
        roleVerifier?: IRoleVerifier,
        decorate: boolean = true
    ) {
        // BackwardsCompatibilityHostDecorator is used for backwards compatibility with older versions of the Teams client.
        // LiveShareHostDecorator is used as a thin caching layer for some host APIs.
        this._host = decorate
            ? new BackwardsCompatibilityHostDecorator(
                  new LiveShareHostDecorator(host)
              )
            : host;
        this._timestampProvider = !!timestampProvider
            ? timestampProvider
            : new HostTimestampProvider(this._host);
        this._roleVerifier = !!roleVerifier
            ? roleVerifier
            : new RoleVerifier(this._host);
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
     * Set the timestamp provider for the runtime
     * @param timestampProvider timestamp provider to set
     */
    public setTimestampProvider(timestampProvider: ITimestampProvider) {
        this._timestampProvider = timestampProvider;
    }

    /**
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
            throw new Error("LiveShareRuntime.start(): cannot call start when already started");
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
            throw new Error("LiveShareRuntime.stop(): cannot call stop when not already started");
        }
        this._started = false;
        // Start provider if needed
        if (
            isTimestampProvider(this._timestampProvider) &&
            this._timestampProvider.isRunning
        ) {
            this._timestampProvider.stop();
        }
        this.objectManager.stop();
    }

    /**
     * @hidden
     * Do not use this API unless you know what you are doing. Can cause the object synchronizer to stop working.
     */
    public __dangerouslySetContainerRuntime(cRuntime: IContainerRuntimeSignaler) {
        if (this._containerRuntime === cRuntime) return;
        this._containerRuntime = cRuntime;
        if (this._objectManager) {
            this._objectManager.stop();
        }
        this._objectManager = new LiveObjectManager(
            this, this._containerRuntime
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
