/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { ITokenProvider, ITokenResponse } from "@fluidframework/routerlicious-driver";
import { TeamsClientApi, TestTeamsClientApi } from './TestTeamsClientApi';

/**
 * Token Provider implementation for connecting to Cowatch Cloud endpoint
 */
export class TeamsFluidTokenProvider implements ITokenProvider {
    private _teamsClient?: TeamsClientApi;
    private _frsToken?: string;
    private _documentId?: string;
    private _tenantId?: string;

    public async fetchOrdererToken(tenantId: string, documentId?: string, refresh?: boolean): Promise<ITokenResponse> {
        const tokenResponse = await this.fetchFluidToken(tenantId, documentId, refresh);
        return tokenResponse;
    }

    public async fetchStorageToken(tenantId: string, documentId?: string, refresh?: boolean): Promise<ITokenResponse> {
        const tokenResponse = await this.fetchFluidToken(tenantId, documentId, refresh);
        return tokenResponse;
    }

    private async fetchFluidToken(tenantId: string, documentId?: string, refresh?: boolean): Promise<ITokenResponse> {
        const teamsClient = await this.getTeamsClient();

        let fromCache: boolean;
        if (!this._frsToken
            || refresh
            || this._tenantId !== tenantId
            || this._documentId !== documentId) {
            this._frsToken = await teamsClient.interactive.getFluidToken(documentId);
            fromCache = false;
        } else {
            fromCache = true;
        }
        this._tenantId = tenantId;
        if (documentId) {
            this._documentId = documentId;
        } 
        return {
            jwt: this._frsToken,
            fromCache,
        };
    }

    private async getTeamsClient(): Promise<TeamsClientApi> {
        if (!this._teamsClient) {
            if (window) {
                this._teamsClient = (await import('@microsoft/teams-js') as any) as TeamsClientApi;
            } else {
                this._teamsClient = new TestTeamsClientApi();
            }
        }

        return this._teamsClient;
    } 
}
