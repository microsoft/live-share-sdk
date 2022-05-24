/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { UserMeetingRole } from "../interfaces";

/**
 * @hidden
 */
export enum ParticipantRole {
  organizer = 'organizer',
  participant = 'participant'
}

/**
 * @hidden
 */
export enum UserState {
  InChat = "InChat",
  InCall = "InCall",
  InCollaborationSession = "InCollaborationSession",
}

/**
 * @hidden
 */
export enum AuthType {
  Unauthenticated = 0,
  SkypeToken = 1 << 0,
  CoWatchToken = 1 << 1,
}

/**
 * @hidden
 */
export enum ParticipantType {
  Host = "Host",
  Guest = "Guest",
}

/**
 * @hidden
 */
export interface IAppDefinition {
  appId: string;
  // TODO
}
/**
 * @hidden
 */
export interface ICollabSpaceInfo {
  // The id of the collabSpace the user is in
  collabSpaceId: string;
  // URI/id to the actual meeting instance
  meetingUrl?: string;
  // Data related to connecting to PowerPoint State
  broadcaster?: {
    // Which PowerPoint state endpoint to connect to
    endpoint: string;
    // Contains the credentials needed to connect to PPS
    credentials?: IPPSTokenResponse;
    // FRS tenant info
    frsTenantInfo?: IFRSTenantInfo;
  };
  sessions: ISessionState[];
}

/**
 * @hidden
 */
export interface IFRSTenantInfo {
  tenantId: string;
  ordererEndpoint: string;
  storageEndpoint: string;
}

/**
 * @hidden
 */
 export interface IUserState {
  // The ID of the app as defined by the app developer
  appId: string;
  // The user id
  userId?: string;
  // The id of the collabSpace the user is in
  collabSpaceId: string;
  // unix timestamp of last heartbeat, LONG
  expiresAt: number;
  // What type of participant this user is
  participantType: ParticipantType;
  // Describes what the user is currently doing as it relates to CoWatch
  currentContext: UserState;
}

/**
 * @hidden
 */
export interface ISessionState {
  // The id of the collabSpace the user is in
  collabSpaceId: string;
  // The ID of the app as defined by the app developer
  appId: string;
  // The id of the session
  sessionId: string;
  // What type of session this is
  sessionType: "dataSession" | "mediaSession" | string;
  // Metadata, which is based on the type of session (TODO: define for media and data session)
  sessionMetadata: object;
}

/**
 * @hidden
 */
export interface IUserTokenResponse {
  // The token value
  userAuthToken: string;
}

/**
 * @hidden
 */
export interface IPPSTokenResponse {
  // The token value
  token: string;
  // The mri for the token
  tokenMri: string;
  // The expiry date in Unix time
  expiresAt: number;
}

/**
 * @hidden
 */
export namespace Requests {
  /**
   * @hidden
   */
  export type IUserStateUpdate = Partial<
    Pick<IUserState, "appId" | "collabSpaceId" | "participantType" | "currentContext">
  >;
  /**
   * @hidden
   */
  export type ICollabSpaceInfoUpdate = Partial<Omit<ICollabSpaceInfo, "credentials" | "sessions">>;

  /**
   * @hidden
   */
  export interface ITokenRequest {
    // The appId to generate a token for
    appId: string;
    //  Length of time the token should be valid for in minutes (Default 1 yr)
    validityLength?: number;
  }
  /**
   * @hidden
   */
  export interface IFluidStateRequest {
    // Collaboration space Id
    spaceId: string;
    //  Fluid Container ID
    containerId: string;
  }
}

/**
 * @hidden
 */
export interface ITokenPayload {
  oid: string;
  aud: string;
  tid: string;
}

/**
 * @hidden
 */
export interface INtpTime {
  ntpTime: string;
  ntpTimeInUTC: number;
}

/**
 * @hidden
 */
 export interface IServerTimeOffset {
  offset: number;
  serverTimeInUtc: number;
  localTimeInUtc: number;
  requestLatency: number;
}

/**
 * @hidden
 */
export interface IRegisteredUsersRoles {
  userRoles: UserMeetingRole[];
}

/**
 * @hidden
 */
 export interface IVerifiedUserRoles {
  rolesAccepted: boolean;
}

/**
 * @hidden
 */
 export interface ITokenResponse {
  token: string;
}