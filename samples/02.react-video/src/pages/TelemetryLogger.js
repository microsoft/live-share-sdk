// uexports.TelemetryUTLogger = exports.PerformanceEvent = exports.MultiSinkLogger = exports.ChildLogger = exports.TaggedLoggerAdapter = exports.TelemetryLogger = exports.TelemetryDataTag = void 0;
// const common_utils_1 = require("@fluidframework/common-utils");
/// const config_1 = require("./config");
// const errorLogging_1 = require("./errorLogging");
/**
 * Broad classifications to be applied to individual properties as they're prepared to be logged to telemetry.
 * Please do not modify existing entries for backwards compatibility.
 */
// var TelemetryDataTag;
// (function (TelemetryDataTag) {
//   /** Data containing terms from code packages that may have been dynamically loaded */
//   TelemetryDataTag["PackageData"] = "PackageData";
//   /** Personal data of a variety of classifications that pertains to the user */
//   TelemetryDataTag["UserData"] = "UserData";
// })(
//   (TelemetryDataTag =
//     exports.TelemetryDataTag || (exports.TelemetryDataTag = {}))
// );

const isRegularObject = (value) => {
  return value !== null && !Array.isArray(value) && typeof value === "object";
};
/** Inspect the given error for common "safe" props and return them */
function extractLogSafeErrorProperties(error, sanitizeStack) {
  const removeMessageFromStack = (stack, errorName) => {
    if (!sanitizeStack) {
      return stack;
    }
    const stackFrames = stack.split("\n");
    stackFrames.shift(); // Remove "[ErrorName]: [ErrorMessage]"
    if (errorName !== undefined) {
      stackFrames.unshift(errorName); // Add "[ErrorName]"
    }
    return stackFrames.join("\n");
  };
  const message =
    typeof (error === null || error === void 0 ? void 0 : error.message) ===
    "string"
      ? error.message
      : String(error);
  const safeProps = {
    message,
  };
  if (isRegularObject(error)) {
    const { errorType, stack, name } = error;
    if (typeof errorType === "string") {
      safeProps.errorType = errorType;
    }
    if (typeof stack === "string") {
      const errorName = typeof name === "string" ? name : undefined;
      safeProps.stack = removeMessageFromStack(stack, errorName);
    }
  }
  return safeProps;
}

const isILoggingError = (x) =>
  typeof (x === null || x === void 0 ? void 0 : x.getTelemetryProperties) ===
  "function";

let stackPopulatedOnCreation;
/**
 * The purpose of this function is to provide ability to capture stack context quickly.
 * Accessing new Error().stack is slow, and the slowest part is accessing stack property itself.
 * There are scenarios where we generate error with stack, but error is handled in most cases and
 * stack property is not accessed.
 * For such cases it's better to not read stack property right away, but rather delay it until / if it's needed
 * Some browsers will populate stack right away, others require throwing Error, so we do auto-detection on the fly.
 * @returns Error object that has stack populated.
 */
function generateErrorWithStack() {
  const err = new Error("<<generated stack>>");
  if (stackPopulatedOnCreation === undefined) {
    stackPopulatedOnCreation = err.stack !== undefined;
  }
  if (stackPopulatedOnCreation) {
    return err;
  }
  try {
    throw err;
  } catch (e) {
    return e;
  }
}
/**
 * TelemetryLogger class contains various helper telemetry methods,
 * encoding in one place schemas for various types of Fluid telemetry events.
 * Creates sub-logger that appends properties to all events
 */
export class TelemetryLogger {
  constructor(namespace, properties) {
    this.namespace = namespace;
    this.properties = properties;
  }
  static formatTick(tick) {
    return Math.floor(tick);
  }
  /**
   * Attempts to parse number from string.
   * If fails,returns original string.
   * Used to make telemetry data typed (and support math operations, like comparison),
   * in places where we do expect numbers (like contentsize/duration property in http header)
   */
  static numberFromString(str) {
    if (str === undefined || str === null) {
      return undefined;
    }
    const num = Number(str);
    return Number.isNaN(num) ? str : num;
  }
  static sanitizePkgName(name) {
    return name.replace("@", "").replace("/", "-");
  }
  /**
   * Take an unknown error object and add the appropriate info from it to the event. Message and stack will be copied
   * over from the error object, along with other telemetry properties if it's an ILoggingError.
   * @param event - Event being logged
   * @param error - Error to extract info from
   * @param fetchStack - Whether to fetch the current callstack if error.stack is undefined
   */
  static prepareErrorObject(event, error, fetchStack) {
    const { message, errorType, stack } = extractLogSafeErrorProperties(
      error,
      true /* sanitizeStack */
    );
    // First, copy over error message, stack, and errorType directly (overwrite if present on event)
    event.stack = stack;
    event.error = message; // Note that the error message goes on the 'error' field
    event.errorType = errorType;
    if (isILoggingError(error)) {
      // Add any other telemetry properties from the LoggingError
      const telemetryProp = error.getTelemetryProperties();
      for (const key of Object.keys(telemetryProp)) {
        if (event[key] !== undefined) {
          // Don't overwrite existing properties on the event
          continue;
        }
        event[key] = telemetryProp[key];
      }
    }
    // Collect stack if we were not able to extract it from error
    if (event.stack === undefined && fetchStack) {
      event.stack = generateErrorWithStack().stack;
    }
  }
  /**
   * Send a telemetry event with the logger
   *
   * @param event - the event to send
   * @param error - optional error object to log
   */
  sendTelemetryEvent(event, error) {
    var _a;
    this.sendTelemetryEventCore(
      Object.assign(Object.assign({}, event), {
        category:
          (_a = event.category) !== null && _a !== void 0 ? _a : "generic",
      }),
      error
    );
  }
  /**
   * Send a telemetry event with the logger
   *
   * @param event - the event to send
   * @param error - optional error object to log
   */
  sendTelemetryEventCore(event, error) {
    const newEvent = Object.assign({}, event);
    if (error !== undefined) {
      TelemetryLogger.prepareErrorObject(newEvent, error, false);
    }
    // Will include Nan & Infinity, but probably we do not care
    if (typeof newEvent.duration === "number") {
      newEvent.duration = TelemetryLogger.formatTick(newEvent.duration);
    }
    this.send(newEvent);
  }
  /**
   * Send an error telemetry event with the logger
   *
   * @param event - the event to send
   * @param error - optional error object to log
   */
  sendErrorEvent(event, error) {
    this.sendTelemetryEventCore(
      Object.assign(Object.assign({}, event), { category: "error" }),
      error
    );
  }
  /**
   * Send a performance telemetry event with the logger
   *
   * @param event - Event to send
   * @param error - optional error object to log
   */
  sendPerformanceEvent(event, error) {
    var _a;
    const perfEvent = Object.assign(Object.assign({}, event), {
      category:
        (_a = event.category) !== null && _a !== void 0 ? _a : "performance",
    });
    this.sendTelemetryEventCore(perfEvent, error);
  }
  prepareEvent(event) {
    const includeErrorProps =
      event.category === "error" || event.error !== undefined;
    const newEvent = Object.assign({}, event);
    if (this.namespace !== undefined) {
      newEvent.eventName = `${this.namespace}${TelemetryLogger.eventNamespaceSeparator}${newEvent.eventName}`;
    }
    if (this.properties) {
      const properties = [];
      properties.push(this.properties.all);
      if (includeErrorProps) {
        properties.push(this.properties.error);
      }
      for (const props of properties) {
        if (props !== undefined) {
          for (const key of Object.keys(props)) {
            if (event[key] !== undefined) {
              continue;
            }
            const getterOrValue = props[key];
            // If this throws, hopefully it is handled elsewhere
            const value =
              typeof getterOrValue === "function"
                ? getterOrValue()
                : getterOrValue;
            if (value !== undefined) {
              newEvent[key] = value;
            }
          }
        }
      }
    }
    return newEvent;
  }
}
// sexports.TelemetryLogger = TelemetryLogger;
TelemetryLogger.eventNamespaceSeparator = ":";
