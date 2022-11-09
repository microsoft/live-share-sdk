/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InkingSurface } from "./inking-surface";
import { DrawingSimulation } from "./drawing-simulation";
import {
    InputFilter,
    IPointerPoint,
    IWetStroke,
    LiveCanvas,
    Stroke,
    WetCanvas,
} from "@microsoft/live-share-canvas";

var localInkingSurface: InkingSurface;
var simulatedInkingSurface: InkingSurface;

function setupButton(buttonId: string, onClick: () => void) {
    const button = document.getElementById(buttonId);

    if (button) {
        button.onclick = onClick;
    }
}

var wetStrokeTestFailures = 0;

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const allTestsCompletedPrefix = "AllTestsCompleted: ";
const wetStrokeTestFailedPrefix = "WetStrokeTestFailed: ";
const dryCanvasTestFailedPrefix = "DryCanvasTestFailed: ";

async function testWetStroke() {
    await delay(100);

    const localWetStroke: IWetStroke = (localInkingSurface.inkingManager as any)
        ._currentStroke;

    if (localWetStroke) {
        const localWetStrokeContext: CanvasRenderingContext2D = (
            localWetStroke as any
        )._canvas._context;

        const remoteWetStroke: IWetStroke = (
            simulatedInkingSurface.getLiveCanvas() as any
        )._wetStrokes.get(localWetStroke.id);

        if (remoteWetStroke) {
            if (localWetStroke.length !== remoteWetStroke.length) {
                console.warn(
                    `${wetStrokeTestFailedPrefix}Local stroke has ${localWetStroke.length} points, remote stroke has ${remoteWetStroke.length} points.`
                );
            } else {
                for (let i = 0; i < localWetStroke.length; i++) {
                    const p1 = localWetStroke.getPointAt(i);
                    const p2 = remoteWetStroke.getPointAt(i);

                    if (
                        p1.x !== p2.x ||
                        p1.y !== p2.y ||
                        p1.pressure !== p2.pressure
                    ) {
                        console.warn(
                            `${wetStrokeTestFailedPrefix}Points at index ${i} are different: ${JSON.stringify(
                                p1
                            )} !== ${JSON.stringify(p2)}`
                        );
                    }
                }
            }

            (localWetStroke as any)._canvas.render();
            (remoteWetStroke as any)._canvas.render();

            const remoteWetStrokeContext: CanvasRenderingContext2D = (
                remoteWetStroke as any
            )._canvas._context;

            const localDataURL = localWetStrokeContext.canvas.toDataURL();
            const remoteDataURL = remoteWetStrokeContext.canvas.toDataURL();

            if (localDataURL !== remoteDataURL) {
                wetStrokeTestFailures++;
            }
        }
    }
}

function testDryCanvas(): boolean {
    const localContext = localInkingSurface.getContext();
    const simulatedRemoteContext = simulatedInkingSurface.getContext();

    const localDataURL = localContext.canvas.toDataURL();
    const simulatedRemoteDataURL = simulatedRemoteContext.canvas.toDataURL();

    return localDataURL === simulatedRemoteDataURL;
}

function displayTestResults(message: string) {
    const testResultsHost = document.getElementById("testResultsHost");

    if (testResultsHost) {
        testResultsHost.innerText = message;
    }
}

async function performTest() {
    displayTestResults("");

    wetStrokeTestFailures = 0;

    const simulation = new DrawingSimulation(localInkingSurface.inkingManager);
    await simulation.draw(testWetStroke);

    await delay(500);

    const dryCanvasTestPassed = testDryCanvas();

    if (!dryCanvasTestPassed) {
        console.warn(
            dryCanvasTestFailedPrefix +
                "Rendering was different on local and remote."
        );
    }

    console.log(
        `${allTestsCompletedPrefix}${
            dryCanvasTestPassed && wetStrokeTestFailures === 0
                ? "Passes"
                : "Failed"
        }`
    );

    displayTestResults(
        `Wet stroke failures: ${wetStrokeTestFailures} - Dry canvas test: ${
            dryCanvasTestPassed ? "Passed" : "Failed"
        }`
    );
}

// This filter forces coordinate precision to be reduced the same ways they are
// when stored in the underlying Fluid storage. This way, the local drawing
// should look the same as the remote drawing, pixel-for-pixel.
class PrecisionReducerFilter extends InputFilter {
    filterPoint(p: IPointerPoint): IPointerPoint {
        const stroke = new Stroke();
        stroke.addPoints(p);

        const serializedStroke = stroke.serialize();
        stroke.deserialize(serializedStroke);

        return stroke.getPointAt(0);
    }
}

window.onload = async () => {
    // Disable wet stroke point simplification in order to produce the same pixels
    // locally and remotely.
    (LiveCanvas as any).wetStrokePointSimplificationThreshold = 50;

    // Disable asynchronous rendering on wet canvases. Asynchronous rendering causes
    // two wet canvases rendering the same exact stroke to not produce the exact same
    // pixels on the screen, making it impossible to test if remote drawing matches
    // local drawing.
    (WetCanvas as any).forceSynchronousRendering = true;

    const localInkHost = document.getElementById("localInkHost");
    const simulatedRemoteInkHost = document.getElementById(
        "simulatedRemoteInkHost"
    );

    if (localInkHost && simulatedRemoteInkHost) {
        localInkingSurface = new InkingSurface(localInkHost, [
            new PrecisionReducerFilter(),
        ]);
        simulatedInkingSurface = new InkingSurface(simulatedRemoteInkHost, []);

        await localInkingSurface.start();
        await simulatedInkingSurface.start();

        setupButton("btnClear", () => {
            localInkingSurface.inkingManager.clear();
        });
        setupButton("btnStartTest", () => {
            performTest();
        });

        const params = new URLSearchParams(window.location.search);
        const config = params.get("startTest");

        if (config && config.toLowerCase() === "true") {
            // Give everything time to settle. Without this, the first wet stroke test
            // tends to fail.
            await delay(1000);

            performTest();
        }
    }
};
