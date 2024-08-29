import { LiveShareRuntime } from "../LiveShareRuntime.js";
import { TestLiveShareHost } from "../../TestLiveShareHost.js";
import {
    IContainerRuntimeSignaler,
    ITimestampProvider,
} from "../../interfaces.js";
import { MockContainerRuntimeSignaler } from "./MockContainerRuntimeSignaler.js";
import { LocalTimestampProvider } from "../../LocalTimestampProvider.js";

export class MockLiveShareRuntime extends LiveShareRuntime {
    constructor(
        shouldCreateMockContainer = false,
        private readonly updateInterval = 10000,
        host = TestLiveShareHost.create(),
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
    connectToOtherRuntime(otherLiveRuntime: MockLiveShareRuntime) {
        MockContainerRuntimeSignaler.connectContainers([
            this.getLocalMockContainer()!,
            otherLiveRuntime.getLocalMockContainer()!,
        ]);
    }
}
