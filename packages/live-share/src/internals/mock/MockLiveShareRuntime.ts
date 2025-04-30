import { LiveShareRuntime } from "../LiveShareRuntime.js";
import { TestLiveShareHost } from "../../TestLiveShareHost.js";
import {
    IContainerRuntimeSignaler,
    ITimestampProvider,
} from "../../interfaces.js";
import { MockContainerRuntimeSignaler } from "./MockContainerRuntimeSignaler.js";
import { LocalTimestampProvider } from "../../LocalTimestampProvider.js";
import { ITokenProvider, ITokenResponse } from "@fluidframework/azure-client";
class MockTokenProvider implements ITokenProvider {
    public async fetchOrdererToken(
        _tenantId: string,
        _documentId?: string,
        _refresh?: boolean
    ): Promise<ITokenResponse> {
        return Promise.reject();
    }
    public async fetchStorageToken(
        _tenantId: string,
        _documentId?: string,
        _refresh?: boolean
    ): Promise<ITokenResponse> {
        return Promise.reject();
    }

}

export class MockLiveShareRuntime extends LiveShareRuntime {
    constructor(
        shouldCreateMockContainer = false,
        private readonly updateInterval = 10000,
        host = TestLiveShareHost.create(new MockTokenProvider()),
        timestampProvider: ITimestampProvider = new LocalTimestampProvider()
    ) {
        super(host, {
            timestampProvider,
        });
        if (shouldCreateMockContainer) {
            const localContainer = new MockContainerRuntimeSignaler();
            this.__dangerouslySetContainerRuntime(localContainer);
        }
    }
    override __dangerouslySetContainerRuntime(
        container: IContainerRuntimeSignaler
    ) {
        if (this._containerRuntime) return;
        super.__dangerouslySetContainerRuntime(container);
        this.objectManager.updateInterval = this.updateInterval;
    }
    getLocalContainer(): IContainerRuntimeSignaler | undefined {
        return this._containerRuntime;
    }
    private getLocalMockContainer(): MockContainerRuntimeSignaler | undefined {
        if (this._containerRuntime instanceof MockContainerRuntimeSignaler)
            return this._containerRuntime;
        return undefined;
    }
    connectToOtherRuntime(...otherLiveRuntimes: MockLiveShareRuntime[]) {
        MockContainerRuntimeSignaler.connectContainers([
            this.getLocalMockContainer()!,
            ...otherLiveRuntimes.map(
                (runtime) => runtime.getLocalMockContainer()!
            ),
        ]);
    }
}
