const childProcess = require("child_process");
const fs = require("fs");
const { argv } = require("process");

async function build(tsConfig) {
    console.log(
        "building",
        process.env.PWD.substring(process.env.PWD.indexOf("packages")),
        tsConfig
    );
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
        JSON.stringify({ type: "Module" })
    );
}

const esmBuildTask = argv.includes("esm")
    ? build("tsconfig.json")
    : Promise.resolve();

const cjsBuildTask = argv.includes("cjs")
    ? build("tsconfig.cjs.json").then(() => addCJSPackageJsonOverride("cjs"))
    : Promise.resolve();

const testBuildTask = argv.includes("test")
    ? build("tsconfig.test.json").then(() => addCJSPackageJsonOverride("test"))
    : Promise.resolve();

Promise.all([esmBuildTask, cjsBuildTask, testBuildTask]);
