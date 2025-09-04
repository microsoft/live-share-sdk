const childProcess = require("child_process");
const { getRootFolder, getPackageNames } = require("./utils");

stagedBuild();

async function stagedBuild() {
    const finished = [];
    const rootFolderPath = await getRootFolder();

    // Removing '@microsoft', or '@live-share-private' prefix from package name
    const packageNames = (await getPackageNames()).map((name) =>
        name.substring(name.indexOf("/") + 1)
    );

    async function build(path) {
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
                    const builtPackage = packageNames.find((packageName) => {
                        const pathName = path.substring(path.indexOf("/") + 1);
                        return packageName === pathName;
                    });
                    finished.push(builtPackage);
                    resolve();
                } else {
                    reject(code);
                }
            });
        });
    }

    // no depedencies
    const stage1 = () => [
        build("internal/test-utils"),
        build("packages/live-share"),
    ];

    // dependent on "packages/live-share"
    const stage2 = () => [
        build("packages/live-share-acs"),
        build("packages/live-share-media"),
        build("packages/live-share-canvas"),
    ];

    // dependent on "stage 2"
    const stage3 = () => [build("packages/live-share-react")];

    await Promise.all(stage1());
    await Promise.all(stage2());
    await Promise.all(stage3());

    const packagesWithoutBuild = packageNames.filter(
        (packageToCheck) => finished.indexOf(packageToCheck) === -1
    );
    if (packagesWithoutBuild.length > 0) {
        throw new Error(
            `Add missing package '${packagesWithoutBuild}' to build stage in 'internal/build-tools/concurrent-packages-build.js'`
        );
    }
}
