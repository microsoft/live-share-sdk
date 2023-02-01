/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IRoleVerifier, UserMeetingRole } from "../interfaces";
import { ClientManager } from "./ClientManager";
/**
 * @hidden
 */
export class RoleVerifier implements IRoleVerifier {
    public constructor(private readonly _clientManager: ClientManager) {}

    public async getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        const clientInfo = await this._clientManager.getClientInfo(clientId);
        return clientInfo.roles;
    }

    public async registerClientId(
        clientId: string
    ): Promise<UserMeetingRole[]> {
        await this._clientManager.registerClientId(clientId);
        const clientInfo = await this._clientManager.getClientInfo(clientId);
        return clientInfo.roles;
    }

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
            const info = await this._clientManager.getClientInfo(clientId);
            const roles = info.roles;
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
