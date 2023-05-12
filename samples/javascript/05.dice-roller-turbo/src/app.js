/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TestLiveShareHost } from "@microsoft/live-share";
import { LiveShareTurboClient } from "@microsoft/live-share-turbo";
import { SharedMap } from "fluid-framework";
import { app, pages, meeting, LiveShareHost } from "@microsoft/teams-js";

const searchParams = new URL(window.location).searchParams;
const root = document.getElementById("content");

// Define key for the diceMap TurboSharedMap
const diceMapKey = "dice-map-key";
// Define key for storing the dice value to display
const diceValueKey = "dice-value-key";

// STARTUP LOGIC

async function start() {
    // Check for page to display
    let view = searchParams.get("view") || "stage";

    // Check if we are running on stage.
    if (searchParams.get("inTeams")) {
        // Initialize teams app
        await app.initialize();

        // Get our frameContext from context of our app in Teams
        const context = await app.getContext();
        if (context.page.frameContext == "meetingStage") {
            view = "stage";
        }
    }

    // Load the requested view
    switch (view) {
        case "content":
            renderSideBar(root);
            break;
        case "config":
            renderSettings(root);
            break;
        case "stage":
        default:
            try {
                const client = await join();
                renderStage(client, root);
            } catch (error) {
                renderError(root, error);
            }
            break;
    }
}

async function join() {
    // Are we running in teams?
    const host = searchParams.get("inTeams")
        ? LiveShareHost.create()
        : TestLiveShareHost.create();

    // Create client & join session
    const client = new LiveShareTurboClient(host);
    await client.join();
    return client;
}

// STAGE VIEW

const stageTemplate = document.createElement("template");

stageTemplate["innerHTML"] = `
  <style>
    .wrapper { text-align: center; color: white }
    .dice { font-size: 156px; }
    .roll { font-size: 36px; }
  </style>
  <div class="wrapper">
  </div>
`;

function renderStage(client, elem) {
    elem.appendChild(stageTemplate.content.cloneNode(true));
    const wrapper = elem.querySelector(".wrapper");
    try {
        const numberOfDice = 3;
        for (let diceIndex = 0; diceIndex < numberOfDice; diceIndex++) {
            renderDiceElement(client, wrapper, diceIndex);
        }
    } catch (error) {
        renderError(elem, error);
    }
}

async function renderDiceElement(client, wrapper, diceIndex) {
    const dynamicMapKey = `${diceMapKey}-${diceIndex}`;
    // Initialize diceMap for dynamicMapKey
    const onDidFirstInitialize = (dds) => {
        // Set initial state of the rolled dice to 1.
        dds.set(diceValueKey, 1);
    };
    const diceMap = await client.getDDS(
        dynamicMapKey,
        SharedMap,
        onDidFirstInitialize
    );
    // Insert dice roller UI into wrapper element
    const diceTemplate = document.createElement("template");
    const diceContainerId = `dice-container-${diceIndex}`;
    diceTemplate["innerHTML"] = `
    <div id="${diceContainerId}">
        <div class="dice"></div>
        <button class="roll"> Roll </button>
    </div>
    `;
    wrapper.appendChild(diceTemplate.content.cloneNode(true));
    const diceContainerElem = document.getElementById(diceContainerId);
    const rollButton = diceContainerElem.querySelector(".roll");
    const dice = diceContainerElem.querySelector(".dice");

    // Set the value at our dataKey with a random number between 1 and 6.
    rollButton.onclick = () =>
        diceMap.set(diceValueKey, Math.floor(Math.random() * 6) + 1);

    // Get the current value of the shared data to update the view whenever it changes.
    const updateDice = () => {
        const diceValue = diceMap.get(diceValueKey);
        // Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
        dice.textContent = String.fromCodePoint(0x267f + diceValue);
        dice.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
    };
    updateDice();

    // Use the changed event to trigger the rerender whenever the value changes.
    diceMap.on("valueChanged", updateDice);
}

// SIDEBAR VIEW

const sideBarTemplate = document.createElement("template");

sideBarTemplate["innerHTML"] = `
  <style>
    .wrapper { text-align: center; color: white }
    .title { font-size: large; font-weight: bolder; }
    .text { font-size: medium; }
  </style>
  <div class="wrapper">
    <p class="title">Lets get started</p>
    <p class="text">Press the share to stage button to share Dice Roller to the meeting stage.</p>
  </div>
`;

function renderSideBar(elem) {
    elem.appendChild(sideBarTemplate.content.cloneNode(true));
    const shareToStageButton = document.createElement("button");
    shareToStageButton["innerHTML"] = "Share to Stage";
    shareToStageButton.onclick = shareToStage;
    elem.appendChild(shareToStageButton);
}

function shareToStage() {
    meeting.shareAppContentToStage((error, result) => {
        if (!error) {
            console.log("Started sharing, sharedToStage result");
        } else {
            console.warn("SharingToStageError", error);
        }
    }, window.location.origin + "?inTeams=1&view=stage");
}

// SETTINGS VIEW

const settingsTemplate = document.createElement("template");

settingsTemplate["innerHTML"] = `
  <style>
    .wrapper { text-align: center; color: white }
    .title { font-size: large; font-weight: bolder; }
    .text { font-size: medium; }
  </style>
  <div class="wrapper">
    <p class="title">Welcome to Dice Roller!</p>
    <p class="text">Press the save button to continue.</p>
  </div>
`;

function renderSettings(elem) {
    elem.appendChild(settingsTemplate.content.cloneNode(true));

    // Save the configurable tab
    pages.config.registerOnSaveHandler((saveEvent) => {
        pages.config.setConfig({
            websiteUrl: window.location.origin,
            contentUrl: window.location.origin + "?inTeams=1&view=content",
            entityId: "DiceRollerFluidLiveShare",
            suggestedDisplayName: "DiceRollerFluidLiveShare",
        });
        saveEvent.notifySuccess();
    });

    // Enable the Save button in config dialog
    pages.config.setValidityState(true);
}

// Error view

const errorTemplate = document.createElement("template");

errorTemplate["inner" + "HTML"] = `
  <style>
    .wrapper { text-align: center; color: red }
    .error-title { font-size: large; font-weight: bolder; }
    .error-text { font-size: medium; }
  </style>
  <div class="wrapper">
    <p class="error-title">Something went wrong</p>
    <p class="error-text"></p>
    <button class="refresh"> Try again </button>
  </div>
`;

function renderError(elem, error) {
    elem.appendChild(errorTemplate.content.cloneNode(true));
    const refreshButton = elem.querySelector(".refresh");
    const errorText = elem.querySelector(".error-text");

    // Refresh the page on click
    refreshButton.onclick = () => {
        window.location.reload();
    };
    console.error(error);
    const errorTextContent = error.toString();
    errorText.textContent = errorTextContent;
}

start().catch((error) => console.error(error));
