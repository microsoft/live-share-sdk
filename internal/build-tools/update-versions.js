#!/usr/bin/env node

// Update these versions, then run: node internal/build-tools/update-versions.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DEFAULT_VERSION_FROM = "1.4.2";
const DEFAULT_VERSION_TO = "1.4.3";
const INTERNAL_PKG_PREFIX = "@microsoft/live-share";

function isInternalLiveSharePackage(name) {
    return (
        name === INTERNAL_PKG_PREFIX ||
        name.startsWith(`${INTERNAL_PKG_PREFIX}-`)
    );
}

function replaceVersion(currentVersion, fromVersion, toVersion) {
    const trimmed = currentVersion.trim();
    if (trimmed === fromVersion) {
        return toVersion;
    }
    const prefix = `${fromVersion}-`;
    if (trimmed.startsWith(prefix)) {
        return `${toVersion}-${trimmed.slice(prefix.length)}`;
    }
    return null;
}

function updatePackageVersion(pkgJson, fromVersion, toVersion) {
    if (!pkgJson.version || !isInternalLiveSharePackage(pkgJson.name || "")) {
        return false;
    }
    const newVersion = replaceVersion(pkgJson.version, fromVersion, toVersion);
    if (newVersion === null) {
        return false;
    }
    pkgJson.version = newVersion;
    return true;
}

function updateInternalLiveShareDeps(pkgJson, fromVersion, toVersion) {
    const sections = [
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
        "resolutions",
    ];
    let changed = false;
    for (const section of sections) {
        for (const [depName, version] of Object.entries(
            pkgJson[section] || {}
        )) {
            if (!isInternalLiveSharePackage(depName)) {
                continue;
            }
            const newVersion = replaceVersion(version, fromVersion, toVersion);
            if (newVersion !== null) {
                pkgJson[section][depName] = newVersion;
                changed = true;
            }
        }
    }
    return changed;
}

async function main() {
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
        encoding: "utf8",
    }).trim();
    const packageFiles = execFileSync(
        "git",
        ["ls-files", "-z", "--", "package.json", "**/package.json"],
        { cwd: repoRoot, encoding: "utf8" }
    )
        .split("\0")
        .filter(Boolean);
    let updatedFiles = 0;
    for (const relativePath of packageFiles) {
        const filePath = path.join(repoRoot, relativePath);
        const pkgJson = JSON.parse(
            await fs.promises.readFile(filePath, "utf8")
        );
        const changedVersion = updatePackageVersion(
            pkgJson,
            DEFAULT_VERSION_FROM,
            DEFAULT_VERSION_TO
        );
        const changedInternalDeps = updateInternalLiveShareDeps(
            pkgJson,
            DEFAULT_VERSION_FROM,
            DEFAULT_VERSION_TO
        );
        if (!changedVersion && !changedInternalDeps) {
            continue;
        }
        await fs.promises.writeFile(
            filePath,
            `${JSON.stringify(pkgJson, null, 4)}\n`,
            "utf8"
        );
        updatedFiles += 1;
        console.log(`[write] ${relativePath}`);
    }
    console.log(`Updated ${updatedFiles} package.json file(s).`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
