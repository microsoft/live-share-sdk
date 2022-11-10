/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    IFluidTenantInfo,
    IFluidContainerInfo,
    INtpTimeInfo,
    UserMeetingRole,
    ILiveShareHost,
} from "../interfaces";

/**
 * @hidden
 */
export interface TeamsClientApi {
    // New liveShare hub
    liveShare?: {
        getHost(): ILiveShareHost;
    };

    // Old interactive hub
    interactive?: TeamsClientApiInteractive;
}

/**
 * @hidden
 */
export interface TeamsClientApiInteractive {
    getFluidTenantInfo(): Promise<IFluidTenantInfo>;
    getFluidToken(containerId?: string): Promise<string>;
    getFluidContainerId(): Promise<IFluidContainerInfo>;
    setFluidContainerId(containerId: string): Promise<IFluidContainerInfo>;
    getNtpTime(): Promise<INtpTimeInfo>;
    registerClientId(clientId: string): Promise<UserMeetingRole[]>;
    getClientRoles(clientId: string): Promise<UserMeetingRole[] | undefined>;
}
