/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { IRequest } from "@fluidframework/core-interfaces";
import {
    IDocumentServiceFactory,
    IUrlResolver,
} from "@fluidframework/driver-definitions/legacy";
import {
    ILocalDeltaConnectionServer,
    LocalDeltaConnectionServer,
} from "@fluidframework/server-local-server";
import { ITestDriver } from "@fluid-internal/test-driver-definitions";
import { LocalDriverApiType, LocalDriverApi } from "./localDriverApi.js";

/**
 * @internal
 */
export class LocalServerTestDriver implements ITestDriver {
    private readonly _server = LocalDeltaConnectionServer.create();
    public readonly endpointName = "local";
    public readonly type = "local";
    public readonly version = "";

    public get server(): ILocalDeltaConnectionServer {
        return this._server;
    }

    constructor(private readonly api: LocalDriverApiType = LocalDriverApi) {
        this._server = api.LocalDeltaConnectionServer.create();
    }

    createDocumentServiceFactory(): IDocumentServiceFactory {
        return new this.api.LocalDocumentServiceFactory(this._server);
    }
    createUrlResolver(): IUrlResolver {
        return new this.api.LocalResolver();
    }
    createCreateNewRequest(testId: string): IRequest {
        return this.api.createLocalResolverCreateNewRequest(testId);
    }

    async createContainerUrl(testId: string): Promise<string> {
        return `http://localhost/${testId}`;
    }
}
