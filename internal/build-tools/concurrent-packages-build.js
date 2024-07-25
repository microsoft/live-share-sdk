const childProcess = require("child_process");
const { getRootFolder } = require("./git-utils");

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

// no depedencies
const stage1 = () => [build("internal"), build("packages/live-share")];

// dependent on "packages/live-share"
const stage2 = () => [
    build("packages/live-share-acs"),
    build("packages/live-share-media"),
    build("packages/live-share-canvas"),
];

// dependent on "stage 2"
const stage3 = () => [build("packages/live-share-react")];

Promise.all(stage1())
    .then(() => Promise.all(stage2()))
    .then(() => Promise.all(stage3()));
