/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { PresenceState, UserMeetingRole } from "@microsoft/live-share";
import { getRandomDiceValue, stylizeDiceElem } from "./utils";

export async function renderMeetingStage(container, elem, theme) {
    const stageTemplate = document.createElement("template");
    stageTemplate["innerHTML"] = `
    <div class="wrapper ${theme} stage">
        <div class="dice"></div>
        <button class="roll">Roll</button>
        <div class="divider"></div>
        <h2>Users:</h2>
    </div>
    `;
    const { diceState, presence } = container.initialObjects;

    elem.appendChild(stageTemplate.content.cloneNode(true));
    const wrapperElem = elem.querySelector(".wrapper");
    await renderSharedDice(diceState, wrapperElem);
    await renderPresenceDiceList(presence, wrapperElem);
}

async function renderSharedDice(diceState, wrapperElem) {
    const rollButton = wrapperElem.querySelector(".roll");
    const diceElem = wrapperElem.querySelector(".dice");

    // Set the value at our dataKey with a random number between 1 and 6.
    rollButton.onclick = () => diceState.set(getRandomDiceValue());

    // Get the current value of the shared data to update the view whenever it changes.
    const updateDice = () => {
        const diceValue = diceState.state;
        stylizeDiceElem(diceElem, diceValue);
    };

    // Use the changed event to trigger the rerender whenever the value changes.
    diceState.on("stateChanged", updateDice);

    // Initialize diceState with initial state of 1 and allowed roles (optional)
    const allowedRoles = [UserMeetingRole.organizer, UserMeetingRole.presenter];
    await diceState.initialize(1, allowedRoles);

    // Render initial dice value
    updateDice();
}

async function renderPresenceDiceList(presence, wrapperElem) {
    // Use the changed event to trigger the rerender whenever the remote value changes.
    presence.on("presenceChanged", (userPresence, local) => {
        renderUserDice(presence, userPresence, local, wrapperElem);
    });

    // Initialize presence with a custom data object
    await presence.initialize({
        diceValue: getRandomDiceValue(),
    });
}

// Render a dice owned by a specific user
async function renderUserDice(presence, userPresence, local, wrapperElem) {
    const userDiceElementId = `user-dice-${userPresence.userId}`;
    let userDiceElement = document.getElementById(userDiceElementId);
    // If the user's state is not offline, remove it from the DOM
    if (userPresence.state !== PresenceState.online) {
        userDiceElement?.remove();
        return;
    }
    // Insert user dice element if it is the first time we have received presence change for this user
    if (!userDiceElement) {
        // Insert user's dice roller into wrapper element
        const diceTemplate = document.createElement("template");
        diceTemplate["innerHTML"] = `
        <div id="${userDiceElementId}" class="user-dice-wrapper">
            <div class="user-name"></div>
            <div class="flex">
                ${local ? '<button class="roll user">Roll</button>' : ""}
                <div class="dice user"></div>
            </div>
        </div>
        `;
        wrapperElem.appendChild(diceTemplate.content.cloneNode(true));
        userDiceElement = document.getElementById(userDiceElementId);
    }

    // Insert the user's name into the DOM
    const nameElem = userDiceElement.querySelector(".user-name");
    nameElem.textContent = local ? "You" : userPresence.displayName;

    // If local user, set the onclick listener for the roll button
    if (local) {
        const rollButton = userDiceElement.querySelector(".roll");
        rollButton.onclick = () =>
            presence.update({
                diceValue: getRandomDiceValue(),
            });
    }

    // Update the dice value in the DOM
    const diceElem = userDiceElement.querySelector(".dice");
    stylizeDiceElem(diceElem, userPresence.data.diceValue);
}
