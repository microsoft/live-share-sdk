// Exposed for other live share libs, or advanced use cases.
export * from "./bin/internals/BaseLiveShareClient";
export * from "./bin/internals/Deferred";
export * from "./bin/internals/DynamicObjectRegistry";
export * from "./bin/internals/DynamicObjectManager";
export * from "./bin/internals/LiveDataObject";
export * from "./bin/internals/LiveEventScope";
export * from "./bin/internals/LiveEventSource";
export * from "./bin/internals/LiveEventTarget";
export * from "./bin/internals/LiveObjectSynchronizer";
export * from "./bin/internals/LiveShareRuntime";
export * from "./bin/internals/schema-injection-utils";
export * from "./bin/internals/smuggle";

export { waitForDelay, waitUntilConnected } from "./bin/internals/utils";
export { MockLiveShareRuntime } from "./bin/internals/mock/MockLiveShareRuntime";
export { isErrorLike } from "./bin/internals/type-guards";
