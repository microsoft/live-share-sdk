/**
 * This file is used to ensure that the live-share-sdk packages are built prior to being used by the samples.
 * This is executed after running `npm install` from the any of the packages or samples, or the root directory.
 */

const childProcess = require("child_process");
const fs = require("fs");
const { getGitHash, getRootFolder, getPackageNames } = require("./utils");

console.log("Ensuring local Live Share SDK packages have been built");
ensurePackagesBuilt();
/**
 * if packages are not built or if they are old builds then:
 *
 * 1. run npm install from root to ensure all dependencies are met
 * 2. run npm run build:packages from root
 */
async function ensurePackagesBuilt() {
    const rootFolderPath = await getRootFolder();
    const currentGitHash = await getGitHash();
    const buildDataJsonPath = `${rootFolderPath}/internal/build-tools/build-data.json`;

    if (doesNeedBuild()) {
        await npmInstallFromDirectory(rootFolderPath);
        await build();
    } else {
        console.log("Live Share SDK packages already built");
    }

    async function npmInstallFromDirectory(directory) {
        console.log("running npm install from: ", directory);
        return new Promise((resolve, reject) => {
            const installProcess = childProcess.spawn(
                "npm",
                ["install", " --ignore-scripts"],
                {
                    shell: true,
                    cwd: directory,
                    stdio: "inherit",
                }
            );

            installProcess.on("close", (code) => {
                if (code == 0) {
                    resolve();
                } else {
                    reject(code);
                }
            });
        });
    }

    async function build() {
        console.log("Building Live Share SDK packages");
        return new Promise((resolve, reject) => {
            const buildProcess = childProcess.spawn(
                "npm",
                ["run", "build:packages"],
                {
                    shell: true,
                    cwd: rootFolderPath,
                    stdio: "inherit",
                }
            );

            buildProcess.on("close", (code) => {
                if (code === 0) {
                    fs.writeFileSync(
                        buildDataJsonPath,
                        JSON.stringify({
                            lastGitHashBuilt: currentGitHash,
                        })
                    );
                    resolve();
                } else {
                    reject(code);
                }
            });
        });
    }

    async function doesNeedBuild() {
        const isOldBuild = currentGitHash !== getBuildData()?.lastGitHashBuilt;
        if (isOldBuild) {
            return true;
        }

        return (await getPackageNames())
            .map((package) =>
                fs.existsSync(`${rootFolderPath}/node_modules/${package}/bin`)
            )
            .includes(false);
    }

    function getBuildData() {
        try {
            return require(buildDataJsonPath);
        } catch {
            return undefined;
        }
    }
}
