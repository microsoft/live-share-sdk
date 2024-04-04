/**
 * This file is used to ensure that the live-share-sdk packages are built prior to being used by the samples.
 * postinstall step may be removed from sample package.json if the sample has been moved outside of the repository.
 */

const childProcess = require("child_process");
const fs = require("fs");

ensurePackagesBuilt();
/**
 * if packages are not built or if they are old builds then:
 *
 * 1. run npm install from "packages/live-share-react".
 *    live-share-react uses all other live-share packages as dependencies, hence will install all packages needed to build live-share packages.
 * 2. run npm run build:packages from root
 */
async function ensurePackagesBuilt() {
    const rootFolderPath = await getRootFolder();
    const currentGitHash = await getGitHash();

    const packagesNotBuilt = !fs.existsSync(
        `${rootFolderPath}/node_modules/@microsoft/live-share-react/bin`
    );
    const isOldBuild = currentGitHash !== getBuildData()?.lastGitHashBuilt;
    if (packagesNotBuilt || isOldBuild) {
        await npmInstallFromLiveShareReact();
        build();
    }

    async function getGitHash() {
        const currentGitHash = childProcess.spawn(
            "git",
            ["rev-parse", "HEAD"],
            {
                shell: true,
                cwd: process.cwd(),
            }
        );
        return new Promise((resolve, reject) => {
            currentGitHash.stdout.on("data", (data) => {
                const hash = data.toString().slice(0, -1);
                resolve(hash);
            });
            currentGitHash.on("close", (code) => {
                if (code != 0) {
                    reject(code);
                }
            });
        });
    }

    async function getRootFolder() {
        const rootDir = childProcess.spawn(
            "git",
            ["rev-parse", " --show-toplevel"],
            {
                shell: true,
                cwd: process.cwd(),
            }
        );

        return new Promise((resolve, reject) => {
            rootDir.stdout.on("data", (data) => {
                const path = data.toString().slice(0, -1);
                resolve(path);
            });
            rootDir.on("close", (code) => {
                if (code != 0) {
                    reject(code);
                }
            });
        });
    }

    // live-share-react uses all other live-share packages as dependencies
    async function npmInstallFromLiveShareReact() {
        return new Promise((resolve, reject) => {
            const installProcess = childProcess.spawn("npm", ["install"], {
                shell: true,
                cwd: `${rootFolderPath}/packages/live-share-react`,
                stdio: "inherit",
            });

            installProcess.on("close", (code) => {
                if (code == 0) {
                    resolve();
                } else {
                    reject(code);
                }
            });
        });
    }

    function build() {
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
                    `${rootFolderPath}/build-data.json`,
                    JSON.stringify({
                        lastGitHashBuilt: currentGitHash,
                    })
                );
            } else {
                throw new Error(`${code}`);
            }
        });
    }

    function getBuildData() {
        try {
            return require(`${rootFolderPath}/build-data.json`);
        } catch {
            return undefined;
        }
    }
}
