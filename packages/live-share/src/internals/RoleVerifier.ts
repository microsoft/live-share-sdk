/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ILiveShareHost, IRoleVerifier, UserMeetingRole } from "../interfaces";
/**
 * @hidden
 */
export class RoleVerifier implements IRoleVerifier {
    public constructor(private readonly _host: ILiveShareHost) {}

    public async verifyRolesAllowed(
        clientId: string,
        allowedRoles: UserMeetingRole[]
    ): Promise<boolean> {
        if (!clientId) {
            throw new Error(
                `RoleVerifier: called verifyRolesAllowed() without a clientId`
            );
        }

        if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
            const info = await this._host.getClientInfo(clientId);
            const roles = info?.roles ?? [];
            for (let i = 0; i < allowedRoles.length; i++) {
                const role = allowedRoles[i];
                if (roles.indexOf(role) >= 0) {
                    return true;
                }
            }

            return false;
        }

        return true;
    }
}
