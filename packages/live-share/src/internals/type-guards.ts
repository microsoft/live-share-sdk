import { IClientInfo, UserMeetingRole } from "../interfaces";

interface IMobileWorkaroundRolesResponse {
    userRoles: UserMeetingRole[];
}

export function isMobileWorkaroundRolesResponse(value: any): value is IMobileWorkaroundRolesResponse {
    return isRolesArray(value?.userRoles);
}

export function isRolesArray(value: any): value is UserMeetingRole[] {
    return Array.isArray(value) && value.every((val) => typeof val === "string");
}

export function isIClientInfo(value: any): value is IClientInfo {
    return value?.userId !== undefined && isRolesArray(value?.roles);
}

// teams-js returns SdkError types, which are an object and not Error, so we have a special guard
export function isErrorLike(value: any): value is { message: string } {
    return typeof value?.message === "string";
}
