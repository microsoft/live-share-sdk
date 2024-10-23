// Exposed for other live share libs, or advanced use cases.
export * from "./internals/BaseLiveShareClient.js";
export * from "./internals/Deferred.js";
export * from "./internals/DynamicObjectRegistry.js";
export * from "./internals/DynamicObjectManager.js";
export * from "./internals/LiveDataObject.js";
export * from "./internals/LiveEventScope.js";
export * from "./internals/LiveEventSource.js";
export * from "./internals/LiveEventTarget.js";
export * from "./internals/LiveObjectSynchronizer.js";
export * from "./internals/LiveShareRuntime.js";
export * from "./internals/schema-injection-utils.js";
export * from "./internals/smuggle.js";

export {
    waitForDelay,
    waitUntilConnected,
    isNewerEvent as isEventNewer,
} from "./internals/utils.js";
export { isErrorLike } from "./internals/type-guards.js";
export { MockLiveShareRuntime } from "./internals/mock/MockLiveShareRuntime.js";
