/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveEventScope } from "../LiveEventScope";
import { UserMeetingRole } from "../../interfaces";
import { MockRuntimeSignaler } from "./MockRuntimeSignaler";
import { MockRoleVerifier } from "./MockRoleVerifier";
import { MockTimestampProvider } from "../../test/MockTimestampProvider";
import { LocalTimestampProvider } from "../../LocalTimestampProvider";
import { TestLiveShareHost } from "../../TestLiveShareHost";
import { LiveShareRuntime } from "../LiveShareRuntime";

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return { localRuntime, remoteRuntime };
}

describe("LiveEventScope", () => {
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

    it("Should raise local and remote events", async () => {
        let triggered = 0;
        const now = new Date().getTime();
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime
        );
        localScope.onEvent("test", (evt, local) => {
            assert(local == true, `Not a local event`);
            assert(evt != null, `Null event arg`);
            assert(evt.name == "test", `Event name is "${evt.name}"`);
            assert(evt.clientId != null, `Missing clientId`);
            assert(typeof evt.timestamp == "number", `Missing timestamp`);
            assert(evt.timestamp >= now, `Timestamp too old`);
            triggered++;
        });

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime
        );
        remoteScope.onEvent("test", (evt, local) => {
            assert(local == false, `Unexpected local event`);
            assert(evt != null, `Null event arg`);
            assert(evt.name == "test", `Event name is "${evt.name}"`);
            assert(evt.clientId != null, `Missing clientId`);
            assert(typeof evt.timestamp == "number", `Missing timestamp`);
            assert(evt.timestamp >= now, `Timestamp too old`);
            triggered++;
        });

        await localScope.sendEvent("test", {});

        assert(triggered == 2, `triggered == ${triggered}`);
    });

    it("Should unsubscribe from events", async () => {
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime
        );
        const handler = (evt, local) => triggered++;
        localScope.onEvent("test", handler);

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime
        );
        remoteScope.onEvent("test", handler);

        await localScope.sendEvent("test", {});

        assert(triggered == 2);

        remoteScope.offEvent("test", handler);
        await localScope.sendEvent("test", {});
        assert((triggered as any) == 3);
    });

    it("Should verify senders role", async () => {
        const verifier = new MockRoleVerifier([UserMeetingRole.organizer]);
        localLiveRuntime.setRoleVerifier(verifier);
        remoteLiveRuntime.setRoleVerifier(verifier);

        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime,
            [UserMeetingRole.organizer]
        );
        localScope.onEvent("test", (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime,
            [UserMeetingRole.organizer]
        );
        remoteScope.onEvent("test", (evt, local) => triggered++);

        await localScope.sendEvent("test", {});

        assert(verifier.called);
        assert(triggered == 2, `Unexpected trigger count of ${triggered}`);
    });

    it("Should block invalid senders", async () => {
        const verifier = new MockRoleVerifier([]);
        localLiveRuntime.setRoleVerifier(verifier);
        remoteLiveRuntime.setRoleVerifier(verifier);

        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime,
            [UserMeetingRole.organizer]
        );
        localScope.onEvent("test", (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime,
            [UserMeetingRole.organizer]
        );
        remoteScope.onEvent("test", (evt, local) => triggered++);

        try {
            await localScope.sendEvent("test", {});
            assert(false, "Event should not have been sent");
        } catch (err) {
            assert(
                err?.message.includes(
                    `The local user doesn't have a role of ["Organizer"]`
                ),
                "Unexpected error"
            );
        }

        assert(verifier.called);
        assert(triggered == 0, `Unexpected trigger count of ${triggered}`);
    });

    it("Should support event scopes with multiple roles", async () => {
        const verifier = new MockRoleVerifier([UserMeetingRole.presenter]);
        localLiveRuntime.setRoleVerifier(verifier);
        remoteLiveRuntime.setRoleVerifier(verifier);

        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime,
            [UserMeetingRole.presenter, UserMeetingRole.organizer]
        );
        localScope.onEvent("test", (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime,
            [UserMeetingRole.presenter, UserMeetingRole.organizer]
        );
        remoteScope.onEvent("test", (evt, local) => triggered++);

        await localScope.sendEvent("test", {});

        assert(verifier.called);
        assert(triggered == 2, `Unexpected trigger count of ${triggered}`);
    });

    it("Should support senders with multiple roles", async () => {
        const verifier = new MockRoleVerifier([
            UserMeetingRole.organizer,
            UserMeetingRole.presenter,
        ]);
        localLiveRuntime.setRoleVerifier(verifier);
        remoteLiveRuntime.setRoleVerifier(verifier);

        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime,
            [UserMeetingRole.presenter]
        );
        localScope.onEvent("test", (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime,
            [UserMeetingRole.presenter]
        );
        remoteScope.onEvent("test", (evt, local) => triggered++);

        await localScope.sendEvent("test", {});

        assert(verifier.called);
        assert(triggered == 2, `Unexpected trigger count of ${triggered}`);
    });

    it("Should support custom timestamp providers", async () => {
        const provider = new MockTimestampProvider();
        localLiveRuntime.setTimestampProvider(provider);
        remoteLiveRuntime.setTimestampProvider(provider);

        let triggered = 0;
        const now = new Date().getTime();
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(
            signalers.localRuntime,
            localLiveRuntime
        );
        localScope.onEvent("test", (evt, local) => {
            assert(evt.timestamp >= now);
            triggered++;
        });

        const remoteScope = new LiveEventScope(
            signalers.remoteRuntime,
            remoteLiveRuntime
        );
        remoteScope.onEvent("test", (evt, local) => {
            assert(evt.timestamp >= now);
            triggered++;
        });

        await localScope.sendEvent("test", {});

        assert(provider.called, `provider not called`);
        assert(triggered == 2, `triggered == ${triggered}`);
    });
});
