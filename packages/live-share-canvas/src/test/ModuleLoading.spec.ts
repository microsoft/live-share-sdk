import "mocha";
import { execFileSync } from "child_process";
import * as path from "path";

describe("Module loading", () => {
    for (const entry of ["core/Stroke", "core/internals/utils"]) {
        it(`supports loading ${entry} first`, () => {
            const script = `
                require(${JSON.stringify(
                    path.resolve(__dirname, "..", entry)
                )});
                const { Stroke } = require(${JSON.stringify(
                    path.resolve(__dirname, "../core/Stroke")
                )});
                const { toCssRgbaColor } = require(${JSON.stringify(
                    path.resolve(__dirname, "../core/Colors")
                )});
                const { strict: assert } = require("assert");
                new Stroke();
                assert.equal(
                    toCssRgbaColor({ r: -10, g: 80, b: 260 }, 1.5),
                    "rgba(0,80,255,1)"
                );
            `;

            execFileSync(
                process.execPath,
                [
                    "--no-experimental-strip-types",
                    "--require",
                    require.resolve("ts-mocha"),
                    "--eval",
                    script,
                ],
                {
                    cwd: path.resolve(__dirname, "../.."),
                    timeout: 10000,
                }
            );
        });
    }
});
