import { UserMeetingRole, IClientInfo } from "../interfaces";
import { BaseHostDecorator } from "./BaseHostDecorator";

import { isClientRolesResponse, isIClientInfo } from "./type-guards";

/**
 * @hidden
 * Temporary fix for android bug which causes IClientInfo to come back with the keys modified
 * Delete in November 2023
 */
export class FormatFixHostDecorator extends BaseHostDecorator {
    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        const clientInfo = await this._host.getClientInfo(clientId);
        if (isIClientInfo(clientId)) {
            return clientInfo;
        }

        const androidBugToClientInfo = androidBugFormatToClientInfo(clientInfo);
        if (androidBugToClientInfo) {
            return androidBugToClientInfo;
        }
        return clientInfo;
    }
}

/**
 * @hidden
 */
function androidBugFormatToClientInfo(value: any): IClientInfo | undefined {
    if (value instanceof Object) {
        let userId: string | undefined;
        let roles: UserMeetingRole[] | undefined;
        let displayName: string | undefined;
        Object.keys(value)
            .map((key) => value[key])
            .forEach((objectValue) => {
                if (isClientRolesResponse(objectValue)) {
                    roles = objectValue;
                } else if (isGuid(objectValue)) {
                    userId = objectValue;
                } else if (typeof objectValue === "string") {
                    displayName = objectValue;
                }
            });

        if (userId && roles) {
            return {
                userId,
                roles,
                displayName,
            };
        }
    }

    return undefined;
}

function isGuid(value: any) {
    if (typeof value === "string") {
        let regex: RegExp =
            /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
        return regex.test(value);
    }

    return false;
}
