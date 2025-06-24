/**
 * Tool used to consolidate building package with different outputs of esm, cjs, or cjs with tests included.
 * Invocation with all arguments looks like `node <path>/build-package.js --cjs --esm --test`
 */

const childProcess = require("child_process");
const fs = require("fs");
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

function addCJSPackageJsonOverride(type) {
    fs.writeFileSync(
        `./bin/${type}/package.json`,
        JSON.stringify({ type: "commonjs" })
    );
}

const esmBuildTask = argv.includes("--esm")
    ? build("tsconfig.json")
    : Promise.resolve();

const cjsBuildTask = argv.includes("--cjs")
    ? build("tsconfig.cjs.json").then(() => addCJSPackageJsonOverride("cjs"))
    : Promise.resolve();

const testBuildTask = argv.includes("--test")
    ? build("tsconfig.test.json").then(() => addCJSPackageJsonOverride("test"))
    : Promise.resolve();

Promise.all([esmBuildTask, cjsBuildTask, testBuildTask]);
