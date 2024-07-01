/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export * from "./AzureLiveShareClient";
export * from "./AzureLiveShareHost";
export * from "./errors";
export * from "./HostTimestampProvider";
export * from "./interfaces";
export * from "./LiveEvent";
export * from "./LiveFollowMode";
export * from "./LivePresence";
export * from "./LivePresenceUser";
export * from "./LiveShareClient";
export * from "./LiveState";
export * from "./LiveTelemetryLogger";
export * from "./LiveTimer";
export * from "./LocalTimestampProvider";
export * from "./TestLiveShareHost";
export * from "./TimeInterval";
export * from "./TimestampProvider";

// TODO: our package structure is such that things that need to be exposed at all for other live share libs
// are in the root of the directory even if they are "internal". move some to internal again?
export * from "./internals/BaseLiveShareClient";
export * from "./internals/DynamicObjectRegistry";
export * from "./internals/DynamicObjectManager";
export * from "./internals/schema-injection-utils";
export * from "./internals/smuggle";

// TODO: move to internal
export * from "./LiveDataObject";
export * from "./LiveEventScope";
export * from "./LiveEventSource";
export * from "./LiveEventTarget";
export * from "./LiveObjectSynchronizer";
export * from "./LiveShareRuntime";
