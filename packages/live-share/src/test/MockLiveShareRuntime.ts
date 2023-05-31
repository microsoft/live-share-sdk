import { LiveShareRuntime } from "../LiveShareRuntime";
import { TestLiveShareHost } from "../TestLiveShareHost";
import { IContainerRuntimeSignaler } from "../interfaces";
import { MockContainerRuntimeSignaler } from "./MockContainerRuntimeSignaler";
import { MockTimestampProvider } from "./MockTimestampProvider";
import { LocalTimestampProvider } from "../LocalTimestampProvider";

export class MockLiveShareRuntime extends LiveShareRuntime {
    constructor(
        shouldCreateMockContainer = false,
        private readonly updateInterval = 10000,
        host = TestLiveShareHost.create()
    ) {
        super(host, new LocalTimestampProvider());
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
