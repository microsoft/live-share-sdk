/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InkingSurface } from "./inking-surface";
import { DrawingSimulation } from "./drawing-simulation";

var localInkingSurface: InkingSurface;
var simulatedInkingSurface: InkingSurface;

const setupButton = (buttonId: string, onClick: () => void) => {
    const button = document.getElementById(buttonId);

    if (button) {
        button.onclick = onClick;
    }
}

window.onload = () => {
    const localInkHost = document.getElementById("localInkHost");
    const simulatedRemoteInkHost = document.getElementById("simulatedRemoteInkHost");

    if (localInkHost && simulatedRemoteInkHost) {
        localInkingSurface = new InkingSurface(localInkHost);
        simulatedInkingSurface = new InkingSurface(simulatedRemoteInkHost);

        localInkingSurface.start();
        simulatedInkingSurface.start();

        setupButton("btnClear", () => { localInkingSurface.inkingManager.clear(); });
        setupButton(
            "btnStartTest",
            () => {
                const simulation = new DrawingSimulation(localInkingSurface.inkingManager);
                simulation.draw();
            });
    }
}

