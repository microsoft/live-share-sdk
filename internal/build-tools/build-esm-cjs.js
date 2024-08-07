const childProcess = require("child_process");
const fs = require("fs");
const { argv } = require("process");

buildAllSelected();

async function buildAllSelected() {
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

    function createCJSPackageJsonOverride(type) {
        fs.writeFileSync(
            `./bin/${type}/package.json`,
            JSON.stringify({
                type: "Module",
            })
        );
    }

    const esm = argv.includes("esm")
        ? build("tsconfig.json")
        : Promise.resolve();

    const cjs = argv.includes("cjs")
        ? build("tsconfig.cjs.json").then(() =>
              createCJSPackageJsonOverride("cjs")
          )
        : Promise.resolve();

    const test = argv.includes("test")
        ? build("tsconfig.test.json").then(() =>
              createCJSPackageJsonOverride("test")
          )
        : Promise.resolve();

    await Promise.all([esm, cjs, test]);
}
