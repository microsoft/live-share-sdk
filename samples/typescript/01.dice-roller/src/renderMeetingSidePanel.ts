/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { meeting } from "@microsoft/teams-js";
import { getRandomDiceValue, stylizeDiceElem } from "./utils";
import { IFluidContainer, SharedMap } from "fluid-framework";
import { AppTheme } from "./types-interfaces";

export async function renderMeetingSidePanel(
    container: IFluidContainer,
    elem: HTMLElement,
    theme: AppTheme
) {
    const storedDiceMap = container.initialObjects.storedDiceMap as SharedMap;
    const sideBarTemplate = document.createElement("template");
    sideBarTemplate["innerHTML"] = `
    <div class="wrapper ${theme}">
        <h1>Let's get started</h1>
        <p class="text">Press the share to meeting button to share Dice Roller to the meeting stage.</p>
        <button class="share">Share to meeting</button>
        <div class="divider"></div>
        <h3>Roll stored dice</h3>
        <p class="text">Because this dice value uses Fluid Framework's SharedMap, it will not reset when all users close the app, making it ideal for use in the meeting side panel. However, it does not support role verification, so use it carefully.</p>
        <div class="dice side-panel"></div>
        <button class="roll side-panel">Roll</button>
    </div>
    `;
    elem.appendChild(sideBarTemplate.content.cloneNode(true));
    const shareButton = elem.querySelector<HTMLButtonElement>(".share")!;

    // Set the value at our dataKey with a random number between 1 and 6.
    shareButton.onclick = shareToStage;

    const wrapperElem = elem.querySelector<HTMLElement>(".wrapper")!;
    await renderStoredDice(storedDiceMap, wrapperElem);
}

// Share dice roller to the meeting stage
function shareToStage() {
    const urlToShare = window.location.origin + "?inTeams=1&view=stage";
    meeting.shareAppContentToStage((error, result) => {
        if (!error) {
            console.log("Started sharing, sharedToStage result");
        } else {
            console.warn("SharingToStageError", error);
        }
    }, urlToShare);
}

const DICE_KEY = "DICE_KEY";

async function renderStoredDice(
    storedDiceMap: SharedMap,
    wrapperElem: HTMLElement
) {
    const rollButton = wrapperElem.querySelector<HTMLButtonElement>(".roll")!;
    const diceElem = wrapperElem.querySelector<HTMLElement>(".dice")!;

    // Set the value at our dice key with a random number between 1 and 6.
    rollButton.onclick = () =>
        storedDiceMap.set(DICE_KEY, getRandomDiceValue());

    // Get the current value of the shared dice to update the view whenever it changes.
    const updateDice = () => {
        const diceValue = storedDiceMap.get<number>(DICE_KEY) ?? 1;
        stylizeDiceElem(diceElem, diceValue);
    };

    // Use the changed event to trigger the rerender whenever the value changes.
    storedDiceMap.on("valueChanged", updateDice);

    // Render initial dice value
    updateDice();
}
