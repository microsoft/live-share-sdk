import {
    ILiveShareHost,
    IFluidTenantInfo,
    IFluidContainerInfo,
    INtpTimeInfo,
    UserMeetingRole,
    IClientInfo,
} from "../interfaces";

export class BaseHostDecorator implements ILiveShareHost {
    /**
     * @hidden
     */
    constructor(readonly _host: ILiveShareHost) {}

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
        return this._host.getClientInfo(clientId);
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
