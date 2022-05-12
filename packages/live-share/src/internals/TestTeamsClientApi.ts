/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { UserMeetingRole } from '../interfaces';
import { LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
   
export enum ContainerState {
    added = 'Added',
    alreadyExists = 'AlreadyExists',
    conflict = 'Conflict',
    notFound = 'NotFound',
}

export interface FluidContainerInfo {
    containerState: ContainerState;
    containerId: string | undefined;
    shouldCreate: boolean;
    retryAfter: number;
}

export interface NtpTimeInfo {
    ntpTime: string;
    ntpTimeInUTC: number;
}

export interface FluidTenantInfo {
    tenantId: string;
    ordererEndpoint: string;
    storageEndpoint: string;
}

export interface TeamsClientApi {
    interactive: TeamsClientApiInteractive;
}

export interface TeamsClientApiInteractive {
    getFluidTenantInfo(): Promise<FluidTenantInfo>;
    getFluidToken(containerId?: string): Promise<string>;
    getFluidContainerId(): Promise<FluidContainerInfo>;
    setFluidContainerId(containerId: string): Promise<FluidContainerInfo>;
    getNtpTime(): Promise<NtpTimeInfo>;
    registerClientId(clientId: string): Promise<UserMeetingRole[]>;
    getClientRoles(clientId: string): Promise<UserMeetingRole[] | undefined>;
}

export class TestTeamsClientApi implements TeamsClientApi {
    constructor(getLocalTestContainerId?: () => string|undefined, setLocalTestContainerId?: (containerId: string) => void) {
        this.interactive = new TestTeamsClientApiInteractive(getLocalTestContainerId, setLocalTestContainerId);
    }

    public readonly interactive: TestTeamsClientApiInteractive;
}

export const LOCAL_MODE_TEST_TOKEN = `test-token`;

class TestTeamsClientApiInteractive implements TeamsClientApiInteractive {
    constructor (
        private _getLocalTestContainerId?: () => string|undefined, 
        private _setLocalTestContainerId?: (containerId: string) => void) { }

    public clientsMeetingRoles: UserMeetingRole[] = [
        UserMeetingRole.organizer,
        UserMeetingRole.presenter,
        UserMeetingRole.attendee
    ];

    public getFluidTenantInfo(): Promise<FluidTenantInfo> {
        return Promise.resolve({
            tenantId: LOCAL_MODE_TENANT_ID,
            ordererEndpoint: "http://localhost:7070",
            storageEndpoint: "http://localhost:7070"
        });
    }

    public getFluidToken(containerId?: string): Promise<string> {
        return Promise.resolve(LOCAL_MODE_TEST_TOKEN);
    }

    public getFluidContainerId(): Promise<FluidContainerInfo> {
        const containerId = this.getLocalTestContainerId();
        return Promise.resolve({
            containerState: containerId ? ContainerState.alreadyExists : ContainerState.notFound,
            shouldCreate: !containerId,
            containerId: containerId,
            retryAfter: 0
        });
    }

    public setFluidContainerId(containerId: string): Promise<FluidContainerInfo> {
        this.setLocalTestContainerId(containerId);
        return Promise.resolve({
            containerState: ContainerState.added,
            containerId: containerId,
            shouldCreate: false,
            retryAfter: 0
        });
    }

    public getNtpTime(): Promise<NtpTimeInfo> {
        const now = new Date();
        return Promise.resolve({
            ntpTime: now.toUTCString(),
            ntpTimeInUTC: now.getTime()
        });
    }

    public registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        return Promise.resolve(this.clientsMeetingRoles);
    }

    public getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        return Promise.resolve(this.clientsMeetingRoles);
    }

    private getLocalTestContainerId(): string|undefined {
        if (this._getLocalTestContainerId) {
            return this._getLocalTestContainerId();
        } else if (window.location.hash) {
            return window.location.hash.substring(1);
        } else {
            return undefined;
        }            
    } 

    private setLocalTestContainerId(containerId: string): void {
        if (this._setLocalTestContainerId) {
            this._setLocalTestContainerId(containerId);
        } else {
            window.location.hash = containerId;
        }            
    } 

}
