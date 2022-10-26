/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    ITokenProvider,
    ITokenResponse,
} from "@fluidframework/routerlicious-driver";
import { ILiveShareHost } from "../interfaces";

/**
 * @hidden
 * Token Provider implementation for connecting to a Live Share Host
 */
export class LiveShareTokenProvider implements ITokenProvider {
    private _frsToken?: string;
    private _documentId?: string;
    private _tenantId?: string;

    public constructor(private readonly _host: ILiveShareHost) {}

    public async fetchOrdererToken(
        tenantId: string,
        documentId?: string,
        refresh?: boolean
    ): Promise<ITokenResponse> {
        const tokenResponse = await this.fetchFluidToken(
            tenantId,
            documentId,
            refresh
        );
        return tokenResponse;
    }

    public async fetchStorageToken(
        tenantId: string,
        documentId?: string,
        refresh?: boolean
    ): Promise<ITokenResponse> {
        const tokenResponse = await this.fetchFluidToken(
            tenantId,
            documentId,
            refresh
        );
        return tokenResponse;
    }

    private async fetchFluidToken(
        tenantId: string,
        documentId?: string,
        refresh?: boolean
    ): Promise<ITokenResponse> {
        let fromCache: boolean;
        if (
            !this._frsToken ||
            refresh ||
            this._tenantId !== tenantId ||
            this._documentId !== documentId
        ) {
            this._frsToken = await this._host.getFluidToken(documentId);
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
}
