#!/usr/bin/env node

/**
 * Updates Fluid dependency ranges and internal Live Share package versions across the repo.
 * Usage: edit the DEFAULT_* constants below, then run this script from anywhere:
 *   node internal/build-tools/update-fluid-range.js
 * The repo root is auto-detected via git; no CLI flags required.
 * This writes changes in place (no dry-run). Commit/revert as needed after inspection.
 */

const fs = require("fs");
const path = require("path");
const { getRootFolder } = require("./utils");

const DEFAULT_FROM_RANGE = ">=2.40 <2.90";
const DEFAULT_TO_RANGE = ">=2.40 <2.100";
const DEFAULT_VERSION_FROM = "2.0.0-internal.15";
const DEFAULT_VERSION_TO = "2.0.0-internal.16";
const INTERNAL_PKG_PREFIX = "@microsoft/live-share";
const IGNORED_FOLDERS = new Set([
    "node_modules",
    ".git",
    "dist",
    "out",
    "bin",
    "nyc",
]);

const fluidMatchers = [
    (name) => name === "fluid-framework",
    (name) => name.startsWith("@fluidframework/"),
    (name) => name.startsWith("@fluid-internal/"),
];

const CONFIG = {
    from: DEFAULT_FROM_RANGE,
    to: DEFAULT_TO_RANGE,
    versionFrom: DEFAULT_VERSION_FROM,
    versionTo: DEFAULT_VERSION_TO,
};

async function findPackageJsonFiles(rootDir) {
    const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        if (IGNORED_FOLDERS.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            const nested = await findPackageJsonFiles(fullPath);
            results.push(...nested);
        } else if (entry.isFile() && entry.name === "package.json") {
            results.push(fullPath);
        }
    }

    return results;
}

function isFluidPackage(name) {
    return fluidMatchers.some((predicate) => predicate(name));
}

function isInternalLiveSharePackage(name) {
    // Covers @microsoft/live-share and subpackages like -canvas, -media, -react, -acs.
    return (
        name === INTERNAL_PKG_PREFIX ||
        name.startsWith(`${INTERNAL_PKG_PREFIX}-`)
    );
}

function updateVersionRanges(pkgJson, fromRange, toRange) {
    const sections = [
        "dependencies",
        "devDependencies",
        "peerDependencies",
        "optionalDependencies",
        "resolutions",
    ];

    let changed = false;

    for (const section of sections) {
        const deps = pkgJson[section];
        if (!deps) {
            continue;
        }

        for (const depName of Object.keys(deps)) {
            if (isFluidPackage(depName) && deps[depName].trim() === fromRange) {
                deps[depName] = toRange;
                changed = true;
            }
        }
    }

    return changed;
}

function updatePackageVersion(pkgJson, fromVersion, toVersion) {
    if (!pkgJson.version) {
        return false;
    }

    if (pkgJson.version.trim() !== fromVersion) {
        return false;
    }

    pkgJson.version = toVersion;
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
        const deps = pkgJson[section];
        if (!deps) {
            continue;
        }

        for (const depName of Object.keys(deps)) {
            if (
                isInternalLiveSharePackage(depName) &&
                deps[depName].trim() === fromVersion
            ) {
                deps[depName] = toVersion;
                changed = true;
            }
        }
    }

    return changed;
}

async function main() {
    const repoRoot = await getRootFolder();

    const packageFiles = await findPackageJsonFiles(repoRoot);
    let updatedFiles = 0;

    for (const filePath of packageFiles) {
        const raw = await fs.promises.readFile(filePath, "utf8");
        const pkgJson = JSON.parse(raw);
        const changedRanges = updateVersionRanges(
            pkgJson,
            CONFIG.from,
            CONFIG.to
        );
        const changedVersion = updatePackageVersion(
            pkgJson,
            CONFIG.versionFrom,
            CONFIG.versionTo
        );
        const changedInternalDeps = updateInternalLiveShareDeps(
            pkgJson,
            CONFIG.versionFrom,
            CONFIG.versionTo
        );

        if (!changedRanges && !changedVersion && !changedInternalDeps) {
            continue;
        }

        updatedFiles += 1;
        const serialized = `${JSON.stringify(pkgJson, null, 4)}\n`;
        await fs.promises.writeFile(filePath, serialized, "utf8");

        const relativePath = path.relative(repoRoot, filePath);
        console.log(
            `[write] ${relativePath}${changedVersion ? " (version)" : ""}${
                changedInternalDeps ? " (internal deps)" : ""
            }${changedRanges ? " (ranges)" : ""}`
        );
    }

    console.log(`Updated ${updatedFiles} package.json file(s).`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
