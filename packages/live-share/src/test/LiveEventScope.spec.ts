/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { LiveEvent } from "../LiveEvent";
import { LiveEventScope } from "../LiveEventScope";
import { UserMeetingRole } from "../interfaces";
import { MockRuntimeSignaler } from './MockRuntimeSignaler';
import { MockRoleVerifier } from './MockRoleVerifier';
import { MockTimestampProvider } from './MockTimestampProvider';
import { LocalRoleVerifier } from '../LocalRoleVerifier';
import { LocalTimestampProvider } from '../LocalTimestampProvider';

function createConnectedSignalers() {
    const localRuntime = new MockRuntimeSignaler();
    const remoteRuntime = new MockRuntimeSignaler();
    MockRuntimeSignaler.connectRuntimes([localRuntime, remoteRuntime]);
    return {localRuntime, remoteRuntime};
}

describe("LiveEventScope", () => {
    it("Should raise local and remote events", (done) => {
        let triggered = 0;
        const now = new Date().getTime();
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime);
        localScope.onEvent('test', (evt, local) => {
            assert(local == true, `Not a local event`);
            assert(evt != null, `Null event arg`);
            assert(evt.name == 'test', `Event name is "${evt.name}"`);
            assert(evt.clientId != null, `Missing clientId`);
            assert(typeof evt.timestamp == 'number', `Missing timestamp`);
            assert(evt.timestamp >= now, `Timestamp too old`);
            triggered++;
        });

        const remoteScope = new LiveEventScope(signalers.remoteRuntime);
        remoteScope.onEvent('test', (evt, local) => {
            assert(local == false, `Unexpected local event`);
            assert(evt != null, `Null event arg`);
            assert(evt.name == 'test', `Event name is "${evt.name}"`);
            assert(evt.clientId != null, `Missing clientId`);
            assert(typeof evt.timestamp == 'number', `Missing timestamp`);
            assert(evt.timestamp >= now, `Timestamp too old`);
            triggered++;
        });

        localScope.sendEvent('test', {});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(triggered == 2, `triggered == ${triggered}`);
            done();
        }, 10);
    });

    it("Should unsubscribe from events", (done) => {
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime);
        const handler = (evt, local) => triggered++;
        localScope.onEvent('test', handler);

        const remoteScope = new LiveEventScope(signalers.remoteRuntime);
        remoteScope.onEvent('test', handler);

        localScope.sendEvent('test', {});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(triggered == 2);

            remoteScope.offEvent('test', handler);
            localScope.sendEvent('test', {});
            setTimeout(() => {
                assert(triggered as any == 3);
                done();
            }, 10);
        }, 10);
    });

    it("Should verify senders role", (done) => {
        const verifier = new MockRoleVerifier([UserMeetingRole.organizer]);
        LiveEvent.setRoleVerifier(verifier);
        
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime, [UserMeetingRole.organizer]);
        localScope.onEvent('test', (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(signalers.remoteRuntime, [UserMeetingRole.organizer]);
        remoteScope.onEvent('test', (evt, local) => triggered++);

        localScope.sendEvent('test', {});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(verifier.called);
            assert(triggered == 2, `Unexpected trigger count of ${triggered}`);
            LiveEvent.setRoleVerifier(new LocalRoleVerifier());
            done();
        }, 10);
    });

    it("Should block invalid senders", (done) => {
        const verifier = new MockRoleVerifier([]);
        LiveEvent.setRoleVerifier(verifier);
        
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime, [UserMeetingRole.organizer]);
        localScope.onEvent('test', (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(signalers.remoteRuntime, [UserMeetingRole.organizer]);
        remoteScope.onEvent('test', (evt, local) => triggered++);

        localScope.sendEvent('test', {});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(verifier.called);
            assert(triggered == 0, `Unexpected trigger count of ${triggered}`);
            done();
        }, 10);
    });

    it("Should support event scopes with multiple roles", (done) => {
        const verifier = new MockRoleVerifier([UserMeetingRole.presenter]);
        LiveEvent.setRoleVerifier(verifier);
        
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime, [UserMeetingRole.presenter, UserMeetingRole.organizer]);
        localScope.onEvent('test', (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(signalers.remoteRuntime, [UserMeetingRole.presenter, UserMeetingRole.organizer]);
        remoteScope.onEvent('test', (evt, local) => triggered++);

        localScope.sendEvent('test', {});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(verifier.called);
            assert(triggered == 2, `Unexpected trigger count of ${triggered}`);
            LiveEvent.setRoleVerifier(new LocalRoleVerifier());
            done();
        }, 10);
    });

    it("Should support senders with multiple roles", (done) => {
        const verifier = new MockRoleVerifier([UserMeetingRole.organizer, UserMeetingRole.presenter]);
        LiveEvent.setRoleVerifier(verifier);
        
        let triggered = 0;
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime, [UserMeetingRole.presenter]);
        localScope.onEvent('test', (evt, local) => triggered++);

        const remoteScope = new LiveEventScope(signalers.remoteRuntime, [UserMeetingRole.presenter]);
        remoteScope.onEvent('test', (evt, local) => triggered++);

        localScope.sendEvent('test', {});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(verifier.called);
            assert(triggered == 2, `Unexpected trigger count of ${triggered}`);
            LiveEvent.setRoleVerifier(new LocalRoleVerifier());
            done();
        }, 10);
    });

    it("Should support custom timestamp providers", (done) => {
        const provider = new MockTimestampProvider();
        LiveEvent.setTimestampProvider(provider);

        let triggered = 0;
        const now = new Date().getTime();
        const signalers = createConnectedSignalers();
        const localScope = new LiveEventScope(signalers.localRuntime);
        localScope.onEvent('test', (evt, local) => {
            assert(evt.timestamp >= now);
            triggered++
        });

        const remoteScope = new LiveEventScope(signalers.remoteRuntime);
        remoteScope.onEvent('test', (evt, local) => {
            assert(evt.timestamp >= now);
            triggered++
        });

        localScope.sendEvent('test', {});

        // Verify is an async operation so wait some
        setTimeout(() => {
            assert(provider.called, `provider not called`);
            assert(triggered == 2, `triggered == ${triggered}`);
            LiveEvent.setTimestampProvider(new LocalTimestampProvider());
            done();
        }, 10);
    });
});