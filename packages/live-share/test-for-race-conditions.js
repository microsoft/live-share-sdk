/**
 * This file runs tests 50 times or until failure, and is intended to be used to find race conditions, or validate that they do not exist.
 */

const execSync = require("child_process").execSync;

for (var i = 0; i < 50; i++) {
    console.log("starting run:", i);
    const output = execSync("npm run test", { encoding: "utf-8" });
    console.log("Output was:\n", output);
    console.log("finished run:", i);
}
