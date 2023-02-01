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
    IClientInfo,
} from "./interfaces";

/**
 * Live Share Host implementation used for local testing.
 */
export class TestLiveShareHost implements ILiveShareHost {
    public static readonly LOCAL_MODE_TEST_TOKEN = `test-token`;

    /**
     * Creates an new live share host for local testing.
     * @param getLocalTestContainerId Optional. Function to customize reading the test container ID. The default implementation reads the ID from the browsers # URL.
     * @param setLocalTestContainerId Optional. Function to customize saving the test container ID. The default implementation appends the ID to the browsers # URL.
     * @returns
     */
    public static create(
        getLocalTestContainerId?: () => string | undefined,
        setLocalTestContainerId?: (containerId: string) => void
    ): ILiveShareHost {
        return new TestLiveShareHost(
            getLocalTestContainerId,
            setLocalTestContainerId
        );
    }

    /**
     * @hidden
     */
    private constructor(
        private _getLocalTestContainerId?: () => string | undefined,
        private _setLocalTestContainerId?: (containerId: string) => void
    ) {}

    public clientsMeetingRoles: UserMeetingRole[] = [
        UserMeetingRole.organizer,
        UserMeetingRole.presenter,
        UserMeetingRole.attendee,
    ];

    public getFluidTenantInfo(): Promise<IFluidTenantInfo> {
        return Promise.resolve({
            tenantId: "local",
            ordererEndpoint: "http://localhost:7070",
            storageEndpoint: "http://localhost:7070",
            serviceEndpoint: "http://localhost:7070",
        });
    }

    public getFluidToken(containerId?: string): Promise<string> {
        return Promise.resolve(TestLiveShareHost.LOCAL_MODE_TEST_TOKEN);
    }

    public getFluidContainerId(): Promise<IFluidContainerInfo> {
        const containerId = this.getLocalTestContainerId();
        return Promise.resolve({
            containerState: containerId
                ? ContainerState.alreadyExists
                : ContainerState.notFound,
            shouldCreate: !containerId,
            containerId: containerId,
            retryAfter: 0,
        });
    }

    public setFluidContainerId(
        containerId: string
    ): Promise<IFluidContainerInfo> {
        this.setLocalTestContainerId(containerId);
        return Promise.resolve({
            containerState: ContainerState.added,
            containerId: containerId,
            shouldCreate: false,
            retryAfter: 0,
        });
    }

    public getNtpTime(): Promise<INtpTimeInfo> {
        const now = new Date();
        return Promise.resolve({
            ntpTime: now.toUTCString(),
            ntpTimeInUTC: now.getTime(),
        });
    }

    public registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        return Promise.resolve(this.clientsMeetingRoles);
    }

    public getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        return Promise.resolve(this.clientsMeetingRoles);
    }

    public getClientInfo(clientId: string): Promise<IClientInfo> {
        const info: IClientInfo = {
            userId: clientId, // set userId to clientId since not connected to teams
            roles: this.clientsMeetingRoles,
            displayName: undefined, // default test name?
        };
        return Promise.resolve(info);
    }

    private getLocalTestContainerId(): string | undefined {
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
