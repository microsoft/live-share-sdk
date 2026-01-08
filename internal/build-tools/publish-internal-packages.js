#!/usr/bin/env node

// Dry run:                         node internal/build-tools/publish-internal-packages.js
// Publish for real:                node internal/build-tools/publish-internal-packages.js --publish
// Specify tag other than internal: node internal/build-tools/publish-internal-packages.js --tag my-tag
// Specify One Time passcode:       node internal/build-tools/publish-internal-packages.js --otp 123456

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");
const { getRootFolder } = require("./utils");

const PUBLISH_ORDER = [
    "live-share",
    "live-share-media",
    "live-share-canvas",
    "live-share-react",
    "live-share-acs",
];
const DEFAULT_TAG = "internal";

function parseArgs(argv) {
    const options = {
        dryRun: true,
        tag: DEFAULT_TAG,
        otp: null,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        switch (arg) {
            case "--publish":
                options.dryRun = false;
                break;
            case "--tag":
                options.tag = argv[i + 1] || DEFAULT_TAG;
                i += 1;
                break;
            case "--otp":
                options.otp = argv[i + 1] || null;
                i += 1;
                break;
            case "--help":
            case "-h":
                printHelp();
                process.exit(0);
                break;
            default:
                break;
        }
    }

    if (!options.tag) {
        options.tag = DEFAULT_TAG;
    }

    return options;
}

function promptYesNo(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === "y" || normalized === "yes");
        });
    });
}

function printHelp() {
    console.log(`Usage: publish-internal-packages [options]

Options:
  --publish                           Publish for real (dry-run by default)
  --tag <tag>                         NPM dist-tag to use (default: ${DEFAULT_TAG})
  --otp <code>                        One-time password for two-factor auth
  --help | -h                         Show this help
`);
}

async function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            stdio: "inherit",
            shell: true,
        });

        child.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `${command} ${args.join(" ")} failed with code ${code}`
                    )
                );
            }
        });
    });
}

async function publishPackage(rootDir, packageName, options) {
    const packageDir = path.join(rootDir, "packages", packageName);
    if (!fs.existsSync(packageDir)) {
        throw new Error(`Package directory not found: ${packageDir}`);
    }

    const args = ["publish", "--tag", options.tag];
    if (options.dryRun) {
        args.push("--dry-run");
    }
    if (options.otp) {
        args.push("--otp", options.otp);
    }

    console.log(
        `\nPublishing ${packageName} (${options.dryRun ? "dry-run" : "live"})...`
    );
    await runCommand("npm", args, packageDir);
}

async function publishSequence(repoRoot, options) {
    for (const packageName of PUBLISH_ORDER) {
        await publishPackage(repoRoot, packageName, options);
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const repoRoot = await getRootFolder();

    console.log(`Publishing order: ${PUBLISH_ORDER.join(", ")}`);
    if (options.dryRun) {
        console.log("Dry run only. Pass --publish to publish for real.");
    } else {
        console.log(
            "Live publish requested. A full dry run will execute first."
        );
    }
    console.log(
        "Ensure you have already run npm run build:packages from repo root."
    );

    if (!options.dryRun) {
        console.log("\nRunning mandatory dry run before live publish...");
        await publishSequence(repoRoot, {
            ...options,
            dryRun: true,
            otp: null,
        });
        console.log("\nDry run completed successfully.");

        const confirmed = await promptYesNo(
            "Proceed with LIVE publish? (y/N): "
        );
        if (!confirmed) {
            console.log("Aborting before live publish.");
            return;
        }

        console.log("\nStarting live publish...");
    }

    await publishSequence(repoRoot, options);

    if (!options.dryRun) {
        console.log("\nLive publish completed.");
    }

    console.log(
        `\nAll packages processed (${options.dryRun ? "dry-run" : "published"}).`
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
