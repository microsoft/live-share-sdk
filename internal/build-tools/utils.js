const childProcess = require("child_process");

async function getGitHash() {
    const currentGitHash = childProcess.spawn("git", ["rev-parse", "HEAD"], {
        shell: true,
        cwd: process.cwd(),
    });
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

async function getPackageNames() {
    try {
        const packagePath = `${await getRootFolder()}/package.json`;
        const packagePaths = require(packagePath).workspaces;
        const packages = packagePaths
            .filter((path) => path.includes("packages/"))
            .map((path) => path.substring(path.indexOf("/") + 1))
            .map((package) => `@microsoft/${package}`);

        const internalPackages = packagePaths
            .filter((path) => path.includes("internal/"))
            .map((path) => path.substring(path.indexOf("/") + 1))
            .map((package) => `@live-share-private/${package}`);

        return packages.concat(internalPackages);
    } catch {
        return undefined;
    }
}

module.exports = {
    getGitHash,
    getPackageNames,
    getRootFolder,
};
