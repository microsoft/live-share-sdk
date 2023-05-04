import { IFluidTenantInfo } from "@microsoft/live-share";

/**
 * @hidden
 */
export interface IFluidTenantInfoInput {
    appId?: string;
    originUri: string;
    teamsContextType: TeamsCollabContextType;
    teamsContext: ITeamsContext;
    expiresAt: number;
}

/**
 * @hidden
 */
export interface IFluidGetContainerIdInput extends ILiveShareRequestBase {}

/**
 * @hidden
 */
export interface ITeamsContext {
    meetingJoinUrl?: string;
}

/**
 * @hidden
 */
export interface IFluidSetContainerIdInput extends ILiveShareRequestBase {
    containerId: string;
}

/**
 * @hidden
 */
export interface IFluidClientInfoInput extends ILiveShareRequestBase {
    clientId: string;
}

/**
 * @hidden
 */
export interface IFluidGetTokenInput {
    appId?: string;
    originUri: string;
    teamsContextType: TeamsCollabContextType;
    teamsContext: ITeamsContext;
    containerId?: string;
    // TODO: these are not used on server side    // userId?: string;    // userName?: string;
}

/**
 * @hidden
 */
export enum TeamsCollabContextType {
    MeetingJoinUrl = 1,
    GroupChatId,
}

/**
 * @hidden
 */
export interface ILiveShareRequestBase {
    appId?: string;
    originUri: string;
    teamsContextType: TeamsCollabContextType;
    teamsContext: ITeamsContext;
}


/**
 * @hidden
 */
export interface IFluidTenantInfoResponse {
    broadcaster: {
        frsTenantInfo: IFluidTenantInfo;
    },
}

/**
 * @hidden
 */
export interface IFluidTokenResponse {
    token: string;
}

/**
 * @hidden
 */
export interface IGetClientInfoResponse {
    userId: string;
}
