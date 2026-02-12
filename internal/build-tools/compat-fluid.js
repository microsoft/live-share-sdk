#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Runs compatibility checks to ensure the repo builds against multiple Fluid versions.
const repoRoot = path.resolve(__dirname, "..", "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const defaultVersions = ["2.40.0", "2.50.0", "2.60.0", "2.70.0", "2.80.0"];
const versions = process.argv.slice(2);
const targetVersions = versions.length > 0 ? versions : defaultVersions;

const run = (command, args, cwd = repoRoot) => {
    const result = spawnSync(command, args, {
        cwd,
        stdio: "inherit",
        shell: false,
    });

    return typeof result.status === "number" ? result.status : 1;
};

const updateOverrides = (version) => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    packageJson.overrides["@fluidframework/*"] = version;
    packageJson.overrides["@fluid-internal/*"] = version;
    packageJson.overrides["fluid-framework"] = version;

    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
};

const removePath = (relativePath) => {
    fs.rmSync(path.join(repoRoot, relativePath), { recursive: true, force: true });
};

const testPackages = [
    "packages/live-share",
    "packages/live-share-canvas",
    "packages/live-share-media",
];

let hadFailures = false;

for (const version of targetVersions) {
    console.log(`=== Testing ${version} ===`);
    updateOverrides(version);
    removePath("node_modules");
    removePath("package-lock.json");

    const installStatus = run("npm", ["install"]);
    if (installStatus !== 0) {
        console.log(`install failed for ${version}`);
        hadFailures = true;
        continue;
    }

    const buildStatus = run("npm", ["run", "build:packages"]);
    if (buildStatus !== 0) {
        console.log(`build failed for ${version}`);
        hadFailures = true;
        continue;
    }

    for (const testPackage of testPackages) {
        const testStatus = run("npm", ["run", "test"], path.join(repoRoot, testPackage));
        if (testStatus !== 0) {
            console.log(`tests failed for ${version} in ${testPackage}`);
            hadFailures = true;
        }
    }

    const lsStatus = run("npm", ["ls", "fluid-framework", "--workspaces", "--depth=0"]);
    if (lsStatus !== 0) {
        hadFailures = true;
    }
}

process.exitCode = hadFailures ? 1 : 0;
