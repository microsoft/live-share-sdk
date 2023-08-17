import {
    ILiveShareHost,
    IFluidTenantInfo,
    IFluidContainerInfo,
    INtpTimeInfo,
    UserMeetingRole,
    IClientInfo,
} from "../interfaces";

import { isClientRolesResponse } from "./type-guards";

/**
 * @hidden
 */
export class FormatFixHostDecorator implements ILiveShareHost {
    /**
     * @hidden
     */
    constructor(private readonly _host: ILiveShareHost) {}

    public async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        return this._host.registerClientId(clientId);
    }
    public async getClientRoles(
        clientId: string
    ): Promise<UserMeetingRole[] | undefined> {
        return this._host.getClientRoles(clientId);
    }
    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        const clientInfo = await this._host.getClientInfo(clientId);
        if (isAndroidClientInfoBugFormat(clientInfo)) {
            return {
                userId: clientInfo.lock,
                roles: clientInfo._loadStates,
                displayName: clientInfo.internalState,
            };
        }
        return clientInfo;
    }

    public getFluidTenantInfo(): Promise<IFluidTenantInfo> {
        return this._host.getFluidTenantInfo();
    }

    public getFluidToken(containerId?: string): Promise<string> {
        return this._host.getFluidToken(containerId);
    }

    public getFluidContainerId(): Promise<IFluidContainerInfo> {
        return this._host.getFluidContainerId();
    }

    public setFluidContainerId(
        containerId: string
    ): Promise<IFluidContainerInfo> {
        return this._host.setFluidContainerId(containerId);
    }

    public getNtpTime(): Promise<INtpTimeInfo> {
        return this._host.getNtpTime();
    }
}

/**
 * @hidden
 */
function isAndroidClientInfoBugFormat(
    value: any
): value is AndroidClientInfoBugFormat {
    return (
        typeof value?.lock === "string" &&
        isClientRolesResponse(value?._loadStates) &&
        (typeof value?.internalState === "string" ||
            value?.internalState === undefined)
    );
}

/**
 * @hidden
 */
interface AndroidClientInfoBugFormat {
    /**
     * The user identifier that corresponds to the provided client identifier.
     */
    lock: string;
    /**
     * List of roles of the user.
     */
    _loadStates: UserMeetingRole[];
    /**
     * Optional. The display name for the user.
     */
    internalState?: string;
}
