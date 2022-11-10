/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IRoleVerifier, UserMeetingRole } from "../interfaces";

export class MockRoleVerifier implements IRoleVerifier {
    private _sendersRoles: UserMeetingRole[];

    constructor(sendersRoles: UserMeetingRole[]) {
        this._sendersRoles = sendersRoles;
    }

    public blocked = false;
    public called = false;
    public clientId: string;

    public clientsMeetingRoles: UserMeetingRole[] = [
        UserMeetingRole.organizer,
        UserMeetingRole.presenter,
        UserMeetingRole.attendee,
    ];

    public getClientRoles(clientId: string): Promise<UserMeetingRole[]> {
        this.called = true;
        this.clientId = clientId;
        return Promise.resolve(this._sendersRoles);
    }

    public registerClientId(clientId: string): Promise<UserMeetingRole[]> {
        return Promise.resolve(this.clientsMeetingRoles);
    }

    public verifyRolesAllowed(
        clientId: string,
        allowedRoles: UserMeetingRole[]
    ): Promise<boolean> {
        this.called = true;
        this.clientId = clientId;
        for (let i = 0; i < this._sendersRoles.length; i++) {
            const role = this._sendersRoles[i];
            if (allowedRoles.indexOf(role) >= 0) {
                return Promise.resolve(true);
            }
        }

        this.blocked = true;
        return Promise.resolve(false);
    }
}
