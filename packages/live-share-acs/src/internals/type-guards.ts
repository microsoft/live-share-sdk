/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IFluidContainerInfo, INtpTimeInfo, UserMeetingRole } from "@microsoft/live-share";
import { IFluidTenantInfoResponse, IFluidTokenResponse, IGetClientInfoResponse } from "./interfaces";

/**
 * @hidden
 */
export function isIFluidTenantInfoResponse(
    value: any
): value is IFluidTenantInfoResponse {
    return (
        !!value &&
        typeof value.broadcaster === "object" &&
        typeof value.broadcaster.frsTenantInfo === "object" &&
        typeof value.broadcaster.frsTenantInfo.tenantId === "string" &&
        typeof value.broadcaster.frsTenantInfo.serviceEndpoint === "string"
    );
}

/**
 * @hidden
 */
export function isIFluidTokenResponse(
    value: any
): value is IFluidTokenResponse {
    return !!value && typeof value.token === "string";
}

/**
 * @hidden
 */
export function isIFluidContainerInfo(
    value: any
): value is IFluidContainerInfo {
    return (
        !!value &&
        typeof value.containerState === "string" &&
        (value.containerId === undefined ||
            typeof value.containerId === "string") &&
        typeof value.shouldCreate === "boolean" &&
        typeof value.retryAfter === "number"
    );
}

/**
 * @hidden
 */
export function isINtpTimeInfo(value: any): value is INtpTimeInfo {
    return (
        !!value &&
        typeof value.ntpTime === "string" &&
        typeof value.ntpTimeInUTC === "number"
    );
}

/**
 * @hidden
 */
export function isUserMeetingRoleList(value: any): value is UserMeetingRole[] {
    const meetingRoleValues = Object.values(UserMeetingRole);
    return Array.isArray(value) && value.every((value) => meetingRoleValues.includes(value));
}

/**
 * @hidden
 */
export function isIGetClientInfoResponse(value: any): value is IGetClientInfoResponse {
    return (
        !!value &&
        typeof value.userId === "string"
    );
}
