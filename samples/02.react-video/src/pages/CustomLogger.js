// "use strict";
/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TelemetryLogger } from "./TelemetryLogger";
const common_utils_1 = require("@fluidframework/common-utils");
// const debug_1 = require("debug");
//const logger_1 = require("./logger");
const logger_1 = common_utils_1;

/**
 * Implementation of debug logger
 */
export class DebugLogger extends TelemetryLogger {
  constructor(debug, debugErr, properties) {
    super(undefined, properties);
    this.debug = debug;
    this.debugErr = debugErr;
  }
  /**
   * Create debug logger - all events are output to debug npm library
   * @param namespace - Telemetry event name prefix to add to all events
   * @param properties - Base properties to add to all events
   * @param propertyGetters - Getters to add additional properties to all events
   */
  static create(namespace, properties) {
    // Setup base logger upfront, such that host can disable it (if needed)
    // const debug = (0, debug_1.debug)(namespace);
    // const debugErr = (0, debug_1.debug)(namespace);
    // debugErr.log = console.error.bind(console);
    // debugErr.enabled = true;
    console.log(`creating logger for namespace ${namespace}`);
    const debug = (logString) => console.log(namespace + " " + logString);
    const debugErr = debug;
    return new DebugLogger(debug, debugErr, properties);
  }
  /**
   * Mix in debug logger with another logger.
   * Returned logger will output events to both newly created debug logger, as well as base logger
   * @param namespace - Telemetry event name prefix to add to all events
   * @param properties - Base properties to add to all events
   * @param propertyGetters - Getters to add additional properties to all events
   * @param baseLogger - Base logger to output events (in addition to debug logger being created). Can be undefined.
   */
  static mixinDebugLogger(namespace, baseLogger, properties) {
    if (!baseLogger) {
      return DebugLogger.create(namespace, properties);
    }
    const multiSinkLogger = new logger_1.MultiSinkLogger(undefined, properties);
    multiSinkLogger.addLogger(
      DebugLogger.create(namespace, this.tryGetBaseLoggerProps(baseLogger))
    );
    multiSinkLogger.addLogger(
      logger_1.ChildLogger.create(baseLogger, namespace)
    );
    return multiSinkLogger;
  }
  static tryGetBaseLoggerProps(baseLogger) {
    if (baseLogger instanceof TelemetryLogger) {
      return baseLogger.properties;
    }
    return undefined;
  }
  /**
   * Send an event to debug loggers
   *
   * @param event - the event to send
   */
  send(event) {
    const newEvent = this.prepareEvent(event);
    const isError = newEvent.category === "error";
    let logger = isError ? this.debugErr : this.debug;
    // Use debug's coloring schema for base of the event
    const index = event.eventName.lastIndexOf(
      TelemetryLogger.eventNamespaceSeparator
    );
    const name = event.eventName.substring(index + 1);
    /* if (index > 0) {
      logger = logger.extend(event.eventName.substring(0, index));
    } */
    newEvent.eventName = undefined;
    let tick = "";
    tick = `tick=${TelemetryLogger.formatTick(
      common_utils_1.performance.now()
    )}`;
    // Extract stack to put it last, but also to avoid escaping '\n' in it by JSON.stringify below
    const stack = newEvent.stack ? newEvent.stack : "";
    newEvent.stack = undefined;
    // Watch out for circular references - they can come from two sources
    // 1) error object - we do not control it and should remove it and retry
    // 2) properties supplied by telemetry caller - that's a bug that should be addressed!
    let payload;
    try {
      payload = JSON.stringify(newEvent);
    } catch (error) {
      newEvent.error = undefined;
      payload = JSON.stringify(newEvent);
    }
    if (payload === "{}") {
      payload = "";
    }
    // Force errors out, to help with diagnostics
    if (isError) {
      logger.enabled = true;
    }
    // Print multi-line.
    logger(`${event.eventName} ${name} ${payload} ${tick} ${stack}`);
  }
}

//# sourceMappingURL=debugLogger.js.map
