/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { UserMeetingRole } from "../interfaces";

export enum ParticipantRole {
  organizer = 'organizer',
  participant = 'participant' 
}

export enum UserState {
  InChat = "InChat",
  InCall = "InCall",
  InCollaborationSession = "InCollaborationSession",
}

export enum AuthType {
  Unauthenticated = 0,
  SkypeToken = 1 << 0,
  CoWatchToken = 1 << 1,
}

export enum ParticipantType {
  Host = "Host",
  Guest = "Guest",
}

export interface IAppDefinition {
  appId: string;
  // TODO
}

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

export interface IFRSTenantInfo {
  tenantId: string;
  ordererEndpoint: string;
  storageEndpoint: string;
}

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

export interface IUserTokenResponse {
  // The token value
  userAuthToken: string;
}

export interface IPPSTokenResponse {
  // The token value
  token: string;
  // The mri for the token
  tokenMri: string;
  // The expiry date in Unix time
  expiresAt: number;
}

export namespace Requests {
  export type IUserStateUpdate = Partial<
    Pick<
      IUserState,
      "appId" | "collabSpaceId" | "participantType" | "currentContext"
    >
  >;
  export type ICollabSpaceInfoUpdate = Partial<
    Omit<ICollabSpaceInfo, "credentials" | "sessions">
  >;
  export interface ITokenRequest {
    // The appId to generate a token for
    appId: string;
    //  Length of time the token should be valid for in minutes (Default 1 yr)
    validityLength?: number;
  }
  export interface IFluidStateRequest {
    // Collaboration space Id
    spaceId: string;
    //  Fluid Container ID
    containerId: string;
  }
}

export interface ITokenPayload {
  oid: string;
  aud: string;
  tid: string;
}

export interface INtpTime {
  ntpTime: string;
  ntpTimeInUTC: number;
}

export interface IServerTimeOffset {
  offset: number;
  serverTimeInUtc: number;
  localTimeInUtc: number;
  requestLatency: number;
}

export interface IRegisteredUsersRoles {
  userRoles: UserMeetingRole[];
}

export interface IVerifiedUserRoles {
  rolesAccepted: boolean;
}

export interface ITokenResponse {
  token: string;
}