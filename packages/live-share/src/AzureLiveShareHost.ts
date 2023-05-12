import { AzureMember, IAzureAudience } from "@fluidframework/azure-client";
import {
    IClientInfo,
    IFluidContainerInfo,
    IFluidTenantInfo,
    ILiveShareHost,
    INtpTimeInfo,
    UserMeetingRole,
} from "./interfaces";
import { Deferred } from "./internals";

/**
 * @alpha
 * This host enables using Live Share through your own `AzureClient` implementation.
 * This is not intended to be used with `LiveShareClient`.
 * We provide no SLA guarantees on this implementation while it is in alpha.
 *
 * @remarks
 * To use this API, first pass your `ContainerSchema` through the `getLiveShareContainerSchemaProxy` function.
 * This should be done before calling `.getContainer()` or `createContainer()`.
 * Then, call `setAudience()` with the `IAzureAudience` object (in `AzureContainerServices`) returned by the `AzureClient`.
 */
export class AzureLiveShareHost implements ILiveShareHost {
    private _azureAudienceDeferred = new Deferred<IAzureAudience>();
    private hasWarned: boolean = false;

    /**
     * @hidden
     */
    private constructor(private _shouldWarnLocalTimestamp: boolean) {}

    /**
     * @beta
     * Static constructor for host enables using Live Share through your own `AzureClient` implementation.
     * @param azureAudience the Azure Audience object for your Fluid container
     * @param shouldWarnLocalTimestamp warning for using the local timestamp value for `getNptTime`.
     * @returns new `AzureLiveShareHost` instance
     */
    public static create(shouldWarn: boolean = true): AzureLiveShareHost {
        return new AzureLiveShareHost(shouldWarn);
    }

    /**
     * This function should be called immediately after getting audience from `AzureClient`.
     * @param audience Azure Audience
     */
    public setAudience(audience: IAzureAudience) {
        this._azureAudienceDeferred.resolve(audience);
    }

    /**
     * Register doesn't do anything special here, since we are using AzureAudience in this host
     * @see ILiveShareHost.registerClientId
     */
    public async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        const clientInfo = await this.getClientInfo(clientId);
        return clientInfo?.roles ?? [];
    }

    /**
     * Gets the corresponding `AzureAudience` `IClientInfo` for a given `clientId`
     * @see ILiveShareHost.getClientInfo
     */
    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        const audienceInfo = await this.getAudienceMemberInfo(clientId);
        if (!audienceInfo) {
            throw new Error(
                `AzureLiveShareHost.getClientInfo: audience member not found`
            );
        }
        return {
            userId: audienceInfo.userId,
            roles: this.getRolesForAudienceMember(audienceInfo),
            displayName: audienceInfo.userName,
        };
    }

    /**
     * Uses local timestamp by default.
     * @remarks
     * To remove warning, either set shouldWarn in `.create()`, or override this value with a timestamp from a server.
     *
     * @see ILiveShareHost.getNtpTime
     */
    public async getNtpTime(): Promise<INtpTimeInfo> {
        if (!this.hasWarned && this._shouldWarnLocalTimestamp) {
            console.warn(
                `AzureLiveShareHost is using a local timestamp, which could cause issues when use some LiveDataObject data structures across multiple clients.\n
                To disable this warning, set _shouldWarn in AzureLiveShareHost.create() to false.\n
                To resolve synchronization issues you may encounter, you should implement a service API to get this timestamp value and override this function.`
            );
            this.hasWarned = true;
        }
        const now = new Date();
        return Promise.resolve({
            ntpTime: now.toUTCString(),
            ntpTimeInUTC: now.getTime(),
        });
    }

    /**
     * @deprecated
     * @see ILiveShareHost.getClientRoles
     */
    public async getClientRoles(
        clientId: string
    ): Promise<UserMeetingRole[] | undefined> {
        const clientInfo = await this.getClientInfo(clientId);
        return clientInfo?.roles;
    }

    /**
     * Will throw not implemented exception. Extend this class and override this function when using with `LiveShareClient`.
     * @see ILiveShareHost.getFluidTenantInfo
     */
    public async getFluidTenantInfo(): Promise<IFluidTenantInfo> {
        throw new Error(
            "AzureLiveShareHost.getFluidTenantInfo: not implemented exception"
        );
    }

    /**
     * Will throw not implemented exception. Extend this class and override this function when using with `LiveShareClient`.
     * @see ILiveShareHost.getFluidToken
     */
    public async getFluidToken(
        containerId?: string | undefined
    ): Promise<string> {
        throw new Error(
            "AzureLiveShareHost.getFluidToken: not implemented exception"
        );
    }

    /**
     * Will throw not implemented exception. Extend this class and override this function when using with `LiveShareClient`.
     * @see ILiveShareHost.getFluidContainerId
     */
    public async getFluidContainerId(): Promise<IFluidContainerInfo> {
        throw new Error(
            "AzureLiveShareHost.getFluidContainerId: not implemented exception"
        );
    }

    /**
     * Will throw not implemented exception. Extend this class and override this function when using with `LiveShareClient`.
     * @see ILiveShareHost.setFluidContainerId
     */
    public async setFluidContainerId(
        containerId: string
    ): Promise<IFluidContainerInfo> {
        throw new Error(
            "AzureLiveShareHost.setFluidContainerId: not implemented exception"
        );
    }

    /**
     * @hidden
     */
    protected async getAudienceMemberInfo(
        clientId: string
    ): Promise<AzureMember<any> | undefined> {
        const members = (
            await this._azureAudienceDeferred.promise
        ).getMembers();
        // It's possible that the clientId is an older one, so we check member's connection history for a match
        const memberValues = [...members.values()];
        for (
            let checkIndex = 0;
            checkIndex < memberValues.length;
            checkIndex++
        ) {
            const checkMember = memberValues[checkIndex];
            if (
                checkMember.connections.find(
                    (connection) => connection.id === clientId
                )
            ) {
                return checkMember;
            }
        }
        return undefined;
    }

    /**
     * @hidden
     */
    protected getRolesForAudienceMember(
        member: AzureMember<any>
    ): UserMeetingRole[] {
        if (member.connections.length === 0) {
            return [];
        }
        const mostRecentConnection =
            member.connections[member.connections.length - 1];
        if (mostRecentConnection.mode === "write") {
            // Return presenter role as a signifier of write access.
            // Organizer permission not supported by this host.
            return [UserMeetingRole.presenter];
        }
        // Return presenter role as a signifier of write access.
        // Guest permission not supported by this host.
        return [UserMeetingRole.attendee];
    }
}
