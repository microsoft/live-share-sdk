const childProcess = require("child_process");

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

async function build(path) {
    const rootFolderPath = await getRootFolder();
    return new Promise((resolve, reject) => {
        const buildProcess = childProcess.spawn(
            "npm",
            ["run", "build", `-w="${path}"`],
            {
                shell: true,
                cwd: rootFolderPath,
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

Promise.all([build("internal"), build("packages/live-share")])
    .then(() =>
        Promise.all([
            build("packages/live-share-acs"),
            build("packages/live-share-media"),
            build("packages/live-share-canvas"),
        ])
    )
    .then(() => build("packages/live-share-react"));
