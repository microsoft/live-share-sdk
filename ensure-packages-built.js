/**
 * This file is used to ensure that the live-share-sdk packages are built prior to being used by the samples.
 * postinstall step may be removed from sample package.json if the sample has been moved outside of the repository.
 */

const childProcess = require("child_process");
const fs = require("fs");

const rootDir = childProcess.spawn("git", ["rev-parse", " --show-toplevel"], {
    shell: true,
    cwd: process.cwd(),
});
rootDir.stdout.on("data", (data) => {
    const path = data.toString().slice(0, -1);
    if (!fs.existsSync(`${path}/node_modules/@microsoft/live-share`)) {
        const installProcess = childProcess.spawn("npm", ["install"], {
            shell: true,
            cwd: path,
            stdio: "inherit",
        });

        installProcess.on("close", (code) => {
            build(path);
        });
    } else {
        // don't install again here, just rebuild
        const packageJson = require(`${path}/packages/live-share/package.json`);
        let buildData;
        try {
            buildData = require(`${path}/build-data.json`);
        } catch {
            buildData = undefined;
        }

        if (packageJson.version !== buildData?.lastVersionBuilt) {
            build(path);
        }
    }
});

function build(path) {
    const buildProcess = childProcess.spawn("npm", ["run", "build:packages"], {
        shell: true,
        cwd: path,
        stdio: "inherit",
    });
    const packageJson = require(`${path}/packages/live-share/package.json`);
    const jsonData = {
        lastVersionBuilt: packageJson.version,
    };
    buildProcess.on("close", (code) => {
        if (code === 0) {
            fs.writeFileSync(
                `${path}/build-data.json`,
                JSON.stringify(jsonData)
            );
        }
    });
}
