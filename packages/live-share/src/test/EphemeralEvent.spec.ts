/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { strict as assert } from "assert";
import { requestFluidObject } from "@fluidframework/runtime-utils";
import { ITestObjectProvider } from "@fluidframework/test-utils";
import { describeNoCompat } from "@fluidframework/test-version-utils";
import { EphemeralEvent } from "../EphemeralEvent";
import { Deferred } from './Deferred';
import { MockTimestampProvider } from './MockTimestampProvider';
import { MockRoleVerifier } from './MockRoleVerifier';
import { LocalRoleVerifier } from '../LocalRoleVerifier';
import { LocalTimestampProvider } from '../LocalTimestampProvider';
import { UserMeetingRole, IEphemeralEvent } from "../interfaces";


describeNoCompat("EphemeralEvent", (getTestObjectProvider) => {
    let provider: ITestObjectProvider;
    let object1: EphemeralEvent;
    let object2: EphemeralEvent;

    beforeEach(async () => {
        provider = getTestObjectProvider();
        const container1 = await provider.createContainer(EphemeralEvent.factory);
        object1 = await requestFluidObject<EphemeralEvent>(container1, "default");

        const container2 = await provider.loadContainer(EphemeralEvent.factory);
        object2 = await requestFluidObject<EphemeralEvent>(container2, "default");

        // need to be connected to send signals
        if (!container1.connected) {
            await new Promise((resolve) => container1.once("connected", resolve));
        }
        if (!container2.connected) {
            await new Promise((resolve) => container2.once("connected", resolve));
        }
    });

    it("Should raise local and remote events", async () => {
        const now = new Date().getTime();
        const object1done = new Deferred();
        object1.on("received", (evt, local) => {
            try {
                assert(local == true, `Not a local event`);
                assert(evt != null, `Null event arg`);
                assert(evt.clientId != null, `Missing clientId`);
                assert(typeof evt.timestamp == 'number', `Missing timestamp`);
                assert(evt.timestamp >= now, `Timestamp too old`);
                object1done.resolve();
            } catch (err) {
                object1done.reject(err);
            }
        });
        await object1.start();

        const object2done = new Deferred();
        object2.on("received", (evt, local) => {
            try {
                assert(local == false, `Unexpected local event`);
                assert(evt != null, `Null event arg`);
                assert(evt.clientId != null, `Missing clientId`);
                assert(typeof evt.timestamp == 'number', `Missing timestamp`);
                assert(evt.timestamp >= now, `Timestamp too old`);
                object2done.resolve();
            } catch (err) {
                object2done.reject(err);
            }
        });
        await object2.start();

        object1.sendEvent();

        // Wait for events to trigger
        await Promise.all([object1done.promise, object2done.promise]);
    });

    it("Should throw error if already started", async () => {
        await object1.start();
        try {
            // Ensure started
            assert(object1.isStarted, `not started`);

            // Try second call to start.
            await object1.start();
            assert(false, `exception not thrown`);
        } catch (err) { }
    });

    it("Should throw error if sendEvent() called before start", async () => {
        try {
            await object1.sendEvent();
            assert(false, `exception not thrown`);
        } catch (err) { }
    });

    it("Should getTimestamp() using local timestamp provider", () => {
        const now = new Date().getTime();
        const timestamp = EphemeralEvent.getTimestamp();
        assert(timestamp >= now);
    });

    it("Should getTimestamp() using custom timestamp providers", () => {
        const mock = new MockTimestampProvider();
        EphemeralEvent.setTimestampProvider(mock);

        const now = new Date().getTime();
        const timestamp = EphemeralEvent.getTimestamp();
        assert(timestamp >= now, `Unexpected timestamp value`);
        assert(mock.called, `Mock not called`);

        // Restore local provider
        EphemeralEvent.setTimestampProvider(new LocalTimestampProvider());
    });

    it("Should getClientRoles() using local role verifier", async () => {
        const roles = await EphemeralEvent.getClientRoles('test');
        assert(Array.isArray(roles), `Return value not an array`);
        assert(roles.length > 0, `no roles returned`);
    });

    it("Should verifyRolesAllowed() using local role verifier", async () => {
        const allowed = await EphemeralEvent.verifyRolesAllowed('test', [UserMeetingRole.presenter]);
        assert(allowed, `Role should be allowed`);
    });

    it("Should getClientRoles() using custom role verifier", async () => {
        const mock = new MockRoleVerifier([UserMeetingRole.presenter]);
        EphemeralEvent.setRoleVerifier(mock);

        const roles = await EphemeralEvent.getClientRoles('test');
        assert(Array.isArray(roles), `Return value not an array`);
        assert(roles.length == 1, `no roles returned`);
        assert(mock.called, `mock not called`);
        assert(mock.clientId == 'test', `Invalid clientId of ${mock.clientId}`);

        // Restore local verifier
        EphemeralEvent.setRoleVerifier(new LocalRoleVerifier());
    });

    it("Should verifyRolesAllowed() using custom role verifier", async () => {
        const mock = new MockRoleVerifier([UserMeetingRole.presenter]);
        EphemeralEvent.setRoleVerifier(mock);

        const allowed = await EphemeralEvent.verifyRolesAllowed('test', [UserMeetingRole.presenter]);
        assert(allowed, `Role should be allowed`);
        assert(mock.called, `mock not called`);
        assert(mock.clientId == 'test', `Invalid clientId of ${mock.clientId}`);

        // Restore local verifier
        EphemeralEvent.setRoleVerifier(new LocalRoleVerifier());
    });

    it("Should allow newer received events", () => {
        const current: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const received: IEphemeralEvent = {
            name: 'test',
            clientId: 'CB',
            timestamp: 1001
        };

        const allowed = EphemeralEvent.isNewer(current, received);
        assert(allowed, `event blocked`);
    });

    it("Should block older received events", () => {
        const current: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const received: IEphemeralEvent = {
            name: 'test',
            clientId: 'CB',
            timestamp: 999
        };

        const allowed = EphemeralEvent.isNewer(current, received);
        assert(!allowed, `event allowed`);
    });

    it("Should block events with same timestamp from same client", () => {
        const current: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const received: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const allowed = EphemeralEvent.isNewer(current, received);
        assert(!allowed, `event allowed`);
    });

    it("Should allow events with same timestamp and a different clientId that sorts lower", () => {
        const current: IEphemeralEvent = {
            name: 'test',
            clientId: 'CB',
            timestamp: 1000
        };

        const received: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const allowed = EphemeralEvent.isNewer(current, received);
        assert(allowed, `event blocked`);
    });

    it("Should block events with same timestamp and a different clientId that sorts higher", () => {
        const current: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const received: IEphemeralEvent = {
            name: 'test',
            clientId: 'CB',
            timestamp: 1000
        };

        const allowed = EphemeralEvent.isNewer(current, received);
        assert(!allowed, `event allowed`);
    });

    it("Should debounce newer events", () => {
        const current: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const received: IEphemeralEvent = {
            name: 'test',
            clientId: 'CB',
            timestamp: 1050
        };

        const allowed = EphemeralEvent.isNewer(current, received, 100);
        assert(!allowed, `event allowed`);
    });

    it("Should allow older events that would have debounced the current event", () => {
        const current: IEphemeralEvent = {
            name: 'test',
            clientId: 'CA',
            timestamp: 1000
        };

        const received: IEphemeralEvent = {
            name: 'test',
            clientId: 'CB',
            timestamp: 950
        };

        const allowed = EphemeralEvent.isNewer(current, received, 100);
        assert(allowed, `event blocked`);
    });
});