import { UserMeetingRole, IClientInfo } from "../interfaces";
import { BaseHostDecorator } from "./BaseHostDecorator";

import { isClientRolesResponse } from "./type-guards";

/**
 * @hidden
 */
export class FormatFixHostDecorator extends BaseHostDecorator {
    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        const clientInfo = await this._host.getClientInfo(clientId);
        if (isAndroidClientInfoBugFormat(clientInfo)) {
            return {
                userId: clientInfo.lock,
                roles: clientInfo._loadStates,
                displayName: clientInfo.internalState,
            };
        }
        return clientInfo;
    }
}

/**
 * @hidden
 */
function isAndroidClientInfoBugFormat(
    value: any
): value is AndroidClientInfoBugFormat {
    return (
        typeof value?.lock === "string" &&
        isClientRolesResponse(value?._loadStates) &&
        (typeof value?.internalState === "string" ||
            value?.internalState === undefined)
    );
}

/**
 * @hidden
 */
interface AndroidClientInfoBugFormat {
    /**
     * The user identifier that corresponds to the provided client identifier.
     */
    lock: string;
    /**
     * List of roles of the user.
     */
    _loadStates: UserMeetingRole[];
    /**
     * Optional. The display name for the user.
     */
    internalState?: string;
}
