/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    IClientInfo,
    IFluidContainerInfo,
    IFluidTenantInfo,
    ILiveShareHost,
    INtpTimeInfo,
    UserMeetingRole,
} from "@microsoft/live-share";
import { Call, ParticipantRole } from "@azure/communication-calling";
import {
    IFluidClientInfoInput,
    IFluidGetContainerIdInput,
    IFluidTenantInfoInput,
    IFluidGetTokenInput,
    IFluidSetContainerIdInput,
    TeamsCollabContextType,
    ILiveShareRequestBase,
    isIFluidTenantInfoResponse,
    isIFluidTokenResponse,
    isIFluidContainerInfo,
    isINtpTimeInfo,
    isUserMeetingRoleList,
    isIGetClientInfoResponse,
} from "./internals";

const LiveShareRoutePrefix = "/livesync/v1/acs";
const LiveShareBaseUrl = "https://teams.microsoft.com/api/platform";
const GetNtpTimeRoute = "getNTPTime";
const GetFluidTenantInfoRoute = "fluid/tenantInfo/get";
const RegisterClientRolesRoute = "clientRoles/register";
const FluidTokenGetRoute = "fluid/token/get";
const FluidContainerGetRoute = "fluid/container/get";
const FluidContainerSetRoute = "fluid/container/set";
const ClientInfoGetRoute = "user/get";

/**
 * Configuration options for initializing the ACSTeamsLiveShareHost class
 */
export interface ACSTeamsLiveShareHostOptions {
    /**
     * ACS local user ID
     */
    userId: string;
    /**
     * ACS local user display name
     */
    displayName?: string;
    /**
     * ACS Call
     */
    call: Call;
    /**
     * Meeting join URL used to join a Microsoft Teams meeting.
     */
    teamsMeetingJoinUrl: string;
    /**
     * A callback method to get the latest ACS Skype token.
     */
    acsTokenProvider: () => Promise<string>;
}

/**
 * Azure Communication Services (ACS) `ILiveShareHost` implementation for Teams interop.
 * Intended for use with the `LiveShareClient` class.
 *
 * @remarks
 * Used to join & support Live Share sessions joined through Teams meetings on ACS.
 * Only is compatible with ACS Teams interop. Non-Teams ACS meetings are not supported.
 */
export class ACSTeamsLiveShareHost implements ILiveShareHost {
    private constructor(
        private readonly options: ACSTeamsLiveShareHostOptions
    ) {}

    /**
     * Create the Live Share host that is compatible with ACS Teams interop.
     *
     * @param options host configuration options
     * @returns `ILiveShareHost` instance
     */
    public static create(
        options: ACSTeamsLiveShareHostOptions
    ): ILiveShareHost {
        return new ACSTeamsLiveShareHost(options);
    }

    private get localUserRoles(): UserMeetingRole[] {
        return this.participantRoleToUserMeetingRoles(this.options.call.role);
    }
    private get localClientInfo(): IClientInfo {
        return {
            userId: this.options.userId,
            roles: this.localUserRoles,
            displayName: this.options.displayName,
        };
    }
    private get remoteClients(): IClientInfo[] {
        return this.options.call.remoteParticipants.map((participant) => {
            return {
                userId:
                    participant.identifier.kind === "microsoftTeamsUser"
                        ? participant.identifier.microsoftTeamsUserId
                        : "",
                roles: this.participantRoleToUserMeetingRoles(participant.role),
                displayName: participant.displayName,
            };
        });
    }
    private get clients(): IClientInfo[] {
        return [this.localClientInfo, ...this.remoteClients];
    }

    /**
     * Returns the Fluid service endpoint and tenant to use for the current session.
     */
    public async getFluidTenantInfo(): Promise<IFluidTenantInfo> {
        const request: IFluidTenantInfoInput = {
            ...this.constructBaseRequest(),
            expiresAt: 0,
        };
        const token = await this.options.acsTokenProvider();
        const response = await fetch(
            `${LiveShareBaseUrl}/${LiveShareRoutePrefix}/${GetFluidTenantInfoRoute}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `SkypeToken ${token}`,
                },
                body: JSON.stringify(request),
            }
        );

        const data: unknown = await response.json();
        if (!isIFluidTenantInfoResponse(data)) {
            throw new Error(
                "ACSTeamsLiveShareHost.getFluidTenantInfo: invalid response"
            );
        }
        return data.broadcaster.frsTenantInfo;
    }

    /**
     * Returns the Fluid access token to use for the current session.
     * @param containerId Optional. ID of the container being joined. This will be undefined when creating a new container.
     */
    public async getFluidToken(containerId?: string): Promise<string> {
        const request: IFluidGetTokenInput = {
            ...this.constructBaseRequest(),
            containerId,
        };
        const token = await this.options.acsTokenProvider();
        const response = await fetch(
            `${LiveShareBaseUrl}/${LiveShareRoutePrefix}/${FluidTokenGetRoute}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `SkypeToken ${token}`,
                },
                body: JSON.stringify(request),
            }
        );
        const data: unknown = await response.json();
        if (!isIFluidTokenResponse(data)) {
            throw new Error(
                "ACSTeamsLiveShareHost.getFluidToken: invalid response from server"
            );
        }
        return data.token;
    }

    /**
     * Returns the container mapping information for the current session.
     *
     * @remarks
     * Hosts are required to implement a container mapping service that stores the container ID for
     * the current session.
     */
    public async getFluidContainerId(): Promise<IFluidContainerInfo> {
        const request: IFluidGetContainerIdInput = this.constructBaseRequest();
        const token = await this.options.acsTokenProvider();
        const response = await fetch(
            `${LiveShareBaseUrl}/${LiveShareRoutePrefix}/${FluidContainerGetRoute}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `SkypeToken ${token}`,
                },
                body: JSON.stringify(request),
            }
        );
        const data: unknown = await response.json();
        if (!isIFluidContainerInfo(data)) {
            throw new Error(
                "ACSTeamsLiveShareHost.IFluidContainerInfo: invalid response from server"
            );
        }
        return data;
    }

    /**
     * Attempts to save the ID of the Fluid container created to the hosts mapping service.
     *
     * @remarks
     * Hosts should return a `containerState` of "Added" if the mapping was successfully saved,
     * otherwise a state of "Conflict" should be returned to indicate that another client has
     * already saved a container ID for the current session.
     * @param containerId Id of the Fluid container that was created.
     * @returns Information indicating the success of mapping assignment.
     */
    public async setFluidContainerId(
        containerId: string
    ): Promise<IFluidContainerInfo> {
        const request: IFluidSetContainerIdInput = {
            ...this.constructBaseRequest(),
            containerId,
        };
        const token = await this.options.acsTokenProvider();
        const response = await fetch(
            `${LiveShareBaseUrl}/${LiveShareRoutePrefix}/${FluidContainerSetRoute}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `SkypeToken ${token}`,
                },
                body: JSON.stringify(request),
            }
        );
        const data: unknown = await response.json();
        if (!isIFluidContainerInfo(data)) {
            throw new Error(
                "ACSTeamsLiveShareHost.IFluidContainerInfo: invalid response from server"
            );
        }
        return data;
    }

    /**
     * Returns the global timestamp for the current session.
     */
    public async getNtpTime(): Promise<INtpTimeInfo> {
        const response = await fetch(
            `${LiveShareBaseUrl}/${LiveShareRoutePrefix}/${GetNtpTimeRoute}`,
            {
                method: "GET",
            }
        );
        const data: unknown = await response.json();
        if (!isINtpTimeInfo(data)) {
            throw new Error(
                "ACSTeamsLiveShareHost.IFluidContainerInfo: invalid response from server"
            );
        }
        return data;
    }

    /**
     * Registers the local clients Fluid client ID with the hosts role verification service.
     *
     * @remarks
     * Hosts should expect this to be called anytime the Fluid clients underlying socket connects
     * or reconnects.
     * @param clientId Unique ID assigned to the local Fluid client.
     * @returns An array of meeting roles assigned to the local user.
     */
    public async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        const request: IFluidClientInfoInput = {
            ...this.constructBaseRequest(),
            clientId,
        };
        const token = await this.options.acsTokenProvider();
        const response = await fetch(
            `${LiveShareBaseUrl}/${LiveShareRoutePrefix}/${RegisterClientRolesRoute}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `SkypeToken ${token}`,
                },
                body: JSON.stringify(request),
            }
        );
        const data: unknown = await response.json();
        if (!isUserMeetingRoleList(data)) {
            throw new Error(
                "ACSTeamsLiveShareHost.registerClientId: invalid response from server"
            );
        }
        return data;
    }

    /**
     * Queries the hosts `IUserInfo` for a given client ID.
     * @param clientId ID of the client to lookup.
     * @returns `IUserInfo` for the queried client ID.
     */
    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        const request: IFluidClientInfoInput = {
            ...this.constructBaseRequest(),
            clientId,
        };
        const token = await this.options.acsTokenProvider();
        const response = await fetch(
            `${LiveShareBaseUrl}/${LiveShareRoutePrefix}/${ClientInfoGetRoute}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `SkypeToken ${token}`,
                },
                body: JSON.stringify(request),
            }
        );
        const data: unknown = await response.json();
        if (!isIGetClientInfoResponse(data)) {
            throw new Error(
                "ACSTeamsLiveShareHost.getClientInfo: invalid response from server"
            );
        }
        return this.clients.find(
            (checkClient) => checkClient.userId === data.userId
        );
    }

    /**
     * @deprecated
     * Queries the hosts role verification service for the roles associated with a given client ID.
     * @param clientId ID of teh client to lookup.
     * @returns An array of roles assigned to the queried client ID.
     */
    public async getClientRoles(
        clientId: string
    ): Promise<UserMeetingRole[] | undefined> {
        const userInfo = await this.getClientInfo(clientId);
        return userInfo?.roles;
    }

    private constructBaseRequest(): ILiveShareRequestBase {
        const originUri = window.location.href;
        return {
            originUri,
            teamsContextType: TeamsCollabContextType.MeetingJoinUrl,
            teamsContext: {
                meetingJoinUrl: this.options.teamsMeetingJoinUrl,
            },
        };
    }

    private participantRoleToUserMeetingRoles(
        role: ParticipantRole
    ): UserMeetingRole[] {
        switch (role) {
            case "Co-organizer":
            case "Organizer":
                return [UserMeetingRole.organizer, UserMeetingRole.presenter];
            case "Presenter": {
                return [UserMeetingRole.presenter];
            }
            case "Consumer":
            case "Attendee":
                return [UserMeetingRole.attendee];
            case "Unknown":
            default: {
                return [UserMeetingRole.guest];
            }
        }
    }
}
