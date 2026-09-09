/**
 * Tool used to consolidate building package with different outputs of esm, or esm with tests included.
 * Invocation with all arguments looks like `node <path>/build-package.js --esm --test`
 */

const childProcess = require("child_process");
const { argv } = require("process");

async function build(tsConfig) {
    const cwd = process.cwd();
    console.log("building", cwd.substring(cwd.indexOf("packages")), tsConfig);
    return new Promise((resolve, reject) => {
        const buildProcess = childProcess.spawn(
            "npx",
            ["tsc", "-p", tsConfig],
            {
                shell: true,
                stdio: "inherit",
            }
        );

        buildProcess.on("close", (code) => {
            if (code == 0) {
                resolve();
            } else {
                reject(code);
            }
        });
    });
}

const esmBuildTask = argv.includes("--esm")
    ? build("tsconfig.json")
    : Promise.resolve();

const testBuildTask = argv.includes("--test")
    ? build("tsconfig.test.json")
    : Promise.resolve();

Promise.all([esmBuildTask, testBuildTask]).catch((code) => {
    console.error(`build failed in ${process.cwd()} (tsc exit ${code})`);
    process.exit(typeof code === "number" && code !== 0 ? code : 1);
});
