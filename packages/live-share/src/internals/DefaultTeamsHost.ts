/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ILiveShareHost,
    IFluidTenantInfo,
    IFluidContainerInfo,
    INtpTimeInfo,
    ContainerState,
    UserMeetingRole,
} from "../interfaces";
import { TeamsClientApi, TeamsClientApiInteractive } from "./TeamsClientApi";

/**
 * @hidden
 * Live Share Host implementation used if one isn't passed into the LiveShareClient and teams is detected.
 */
export class DefaultTeamsHost implements ILiveShareHost {
    constructor(private _interactive: TeamsClientApiInteractive) {}

    public getFluidTenantInfo(): Promise<IFluidTenantInfo> {
        return this._interactive.getFluidTenantInfo();
    }

    public getFluidToken(containerId?: string): Promise<string> {
        return this._interactive.getFluidToken(containerId);
    }

    public getFluidContainerId(): Promise<IFluidContainerInfo> {
        return this._interactive.getFluidContainerId();
    }

    public setFluidContainerId(containerId: string): Promise<IFluidContainerInfo> {
        return this._interactive.setFluidContainerId(containerId);
    }

    public getNtpTime(): Promise<INtpTimeInfo> {
        return this._interactive.getNtpTime();
    }

    public registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        return this._interactive.registerClientId(clientId);
    }

    public async getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        return (await this._interactive.getClientRoles(clientId)) ?? [];
    }

    public static async getTeamsHost(): Promise<ILiveShareHost> {
        const teamsApi = (await import("@microsoft/teams-js")) as any as TeamsClientApi;
        if (teamsApi.liveShare) {
            return teamsApi.liveShare.getHost();
        } else if (teamsApi.interactive) {
            return new DefaultTeamsHost(teamsApi.interactive);
        } else {
            throw new Error(`Teams Live Share interface not found`);
        }
    }
}
