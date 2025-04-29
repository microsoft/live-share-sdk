import { ITokenProvider } from "@fluidframework/azure-client";
import { TestLiveShareHost } from "../TestLiveShareHost.js";
import { TimestampProvider } from "../TimestampProvider.js";
import {
    IClientInfo,
    ILiveEvent,
    ILiveShareHost,
    UserMeetingRole,
} from "../interfaces.js";

interface IMobileWorkaroundRolesResponse {
    userRoles: UserMeetingRole[];
}

/**
 * @hidden
 */
export function isMobileWorkaroundRolesResponse(
    value: any
): value is IMobileWorkaroundRolesResponse {
    return isClientRolesResponse(value?.userRoles);
}

/**
 * @hidden
 */
export function isClientRolesResponse(value: any): value is UserMeetingRole[] {
    return (
        Array.isArray(value) && value.every((val) => typeof val === "string")
    );
}

/**
 * @hidden
 */
export function isIClientInfo(value: any): value is IClientInfo | undefined {
    return (
        value === undefined ||
        (value?.userId !== undefined && isClientRolesResponse(value?.roles))
    );
}

/**
 * teams-js returns SdkError types, which are an object and not Error, so we have a special guard
 * @hidden
 */
export function isErrorLike(value: any): value is { message: string } {
    return typeof value?.message === "string";
}

/**
 * @hidden
 */
export function isILiveEvent(value: any): value is ILiveEvent {
    return (
        typeof value === "object" &&
        typeof value.clientId === "string" &&
        (typeof value.targetClientId === "string" ||
            value.targetClientId === undefined) &&
        typeof value.timestamp === "number" &&
        typeof value.name === "string"
    );
}

/**
 * @hidden
 */
export function isTimestampProvider(value: any): value is TimestampProvider {
    return typeof value?.start === "function";
}

type HasInsecureTokenProvider = {
    insecureTokenProvider: ITokenProvider;
};

export function isTestHostWithInsecureTokenProvider(
    value: ILiveShareHost
): value is TestLiveShareHost & HasInsecureTokenProvider {
    return (value as any)?.insecureTokenProvider !== undefined;
}
