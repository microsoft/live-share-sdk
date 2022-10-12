// Define a custom ITelemetry Logger. This logger will be passed into TinyliciousClient
// and gets hooked up to the Tinylicious container telemetry system.
export class ConsoleLogger {
  // eslint-disable-next-line no-useless-constructor
  constructor() {}
  send(event) {
    console.log("fluid telemetry event:".concat(JSON.stringify(event)));
  }
}
