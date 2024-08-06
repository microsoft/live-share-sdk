/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveEventScope } from "../LiveEventScope.js";
import { LiveEventSource } from "../LiveEventSource.js";
import { MockRuntimeSignaler } from "../mock/MockRuntimeSignaler.js";
import { LiveShareRuntime } from "../LiveShareRuntime.js";
import { TestLiveShareHost } from "../../TestLiveShareHost.js";
import { LocalTimestampProvider } from "../../LocalTimestampProvider.js";

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return { localRuntime, remoteRuntime };
}

describe("LiveEventSource", () => {
    let localLiveRuntime = new LiveShareRuntime(TestLiveShareHost.create(), {
        timestampProvider: new LocalTimestampProvider(),
    });
    let remoteLiveRuntime = new LiveShareRuntime(TestLiveShareHost.create(), {
        timestampProvider: new LocalTimestampProvider(),
    });

    afterEach(async () => {
        // restore defaults
        localLiveRuntime = new LiveShareRuntime(TestLiveShareHost.create(), {
            timestampProvider: new LocalTimestampProvider(),
        });
        remoteLiveRuntime = new LiveShareRuntime(TestLiveShareHost.create(), {
            timestampProvider: new LocalTimestampProvider(),
        });
    });

    it("Should send events", (done) => {
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime
        );
        localScope.onEvent("test", (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime
        );
        remoteScope.onEvent("test", (evt, local) => triggered++);

        const localSource = new LiveEventSource(localScope, "test");
        localSource.sendEvent({});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(triggered == 2);
            done();
        }, 10);
    });
});
