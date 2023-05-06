import { HostTimestampProvider } from "./HostTimestampProvider";
import { TimestampProvider } from "./TimestampProvider";
import { IClientInfo, ILiveShareHost, IRoleVerifier, ITimestampProvider, UserMeetingRole } from "./interfaces";
import { RoleVerifier } from "./internals";

/**
 * Runtime for LiveDataObject, which is used to do things like validate roles, get a timestamp
 */
export class LiveShareRuntime {
    private _host: ILiveShareHost;
    private _timestampProvider: ITimestampProvider;
    private _roleVerifier: IRoleVerifier;

    /**
     * 
     * @param host Host for the current Live Share session.
     * @param customTimestampProvider Optional. Custom timestamp provider to use.
     * @param customRoleVerifier Optional. Custom role verifier to use.
     */
    constructor(host: ILiveShareHost, timestampProvider?: ITimestampProvider, roleVerifier?: IRoleVerifier) {
        this._host = host;
        this._timestampProvider = !!timestampProvider ? timestampProvider : new HostTimestampProvider(this._host);
        this._roleVerifier = !!roleVerifier ? roleVerifier : new RoleVerifier(this._host);
    }

    /**
     * Start the timestamp provider
     */
    public async start() {
        // Start provider if needed
        if (this.isTimestampProvider(this._timestampProvider) && !this._timestampProvider.isRunning) {
            await this._timestampProvider.start();
        }

        return Promise.resolve();
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
        return this._roleVerifier.verifyRolesAllowed(
            clientId,
            allowedRoles
        );
    }

    /**
     * Get the client info for a given clientId
     * @param clientId Fluid clientId we are requesting user info for
     * @returns IClientInfo object if the user is known, otherwise it will return undefined
     */
    public getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        return this._host.getClientInfo(clientId);
    }

    /**
     * Set the timestamp provider for the runtime
     * @param newTimestampProvider timestamp provider to set
     */
    public setTimestampProvider(newTimestampProvider: ITimestampProvider) {
        this._timestampProvider = newTimestampProvider;
    }

    /**
     * Set the timestamp provider for the runtime
     * @param newTimestampProvider timestamp provider to set
     */
    public setRoleVerifier(newRoleVerifier: IRoleVerifier) {
        this._roleVerifier = newRoleVerifier;
    }

    /**
     * Set the host for the runtime
     * @param newHost ILiveShareHost to change
     */
    public setHost(newHost: ILiveShareHost) {
        this._host = newHost;
        if (this._timestampProvider instanceof HostTimestampProvider) {
            this._timestampProvider.stop();
            this.setTimestampProvider(new HostTimestampProvider(this._host));
        }
        if (this._roleVerifier instanceof RoleVerifier) {
            this.setRoleVerifier(new RoleVerifier(this._host));
        }
    }

    /**
     * @hidden
     */
    protected isTimestampProvider(value: any): value is TimestampProvider {
        return typeof value?.start === "function";
    }
}
