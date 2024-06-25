/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    TestLiveShareHost,
    LiveState,
    LiveShareClient,
} from "@microsoft/live-share";
import { app, pages, meeting, LiveShareHost } from "@microsoft/teams-js";

const searchParams = new URL(window.location.href).searchParams;
const root = document.getElementById("content")!;

// Define key for the diceMap TurboLiveState
const diceStateKey = "dice-state-key";

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
    const client = new LiveShareClient(host);
    await client.join();
    return client;
}

// STAGE VIEW

const stageTemplate = document.createElement("template");

stageTemplate["innerHTML"] = `
  <style>
    .wrapper { text-align: center; color: white }
    .dice-list { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; width: 100%; }
    .dice { font-size: 156px; }
    .roll { font-size: 36px; }
    .add-dice { margin-bottom: 8px; font-size: 36px; }
  </style>
  <div class="wrapper">
    <button id="add-dice">Add dice</button>
    <div class="dice-list"></div>
  </div>
`;

async function renderStage(client: LiveShareClient, elem: HTMLElement) {
    elem.appendChild(stageTemplate.content.cloneNode(true));
    const wrapper = elem.querySelector<HTMLDivElement>(".wrapper")!;
    const diceListEl = wrapper.querySelector<HTMLDivElement>(".dice-list")!;
    try {
        const numberOfDiceState = await client.getDDS(
            "dynamicMapKey",
            LiveState<number>
        );
        let numberOfDice: number = 1;
        // track which dice we have already rendered, as a safety measure in case multiple people change the state to the same index
        const diceShown = new Set();
        const renderDiceIfNew = () => {
            for (
                let diceIndex = diceShown.size;
                diceIndex < numberOfDice;
                diceIndex++
            ) {
                if (diceShown.has(diceIndex)) continue;
                diceShown.add(diceIndex);
                renderDiceElement(client, diceListEl, diceIndex);
            }
        };
        // Listen for changes to the number of dice
        numberOfDiceState.on("stateChanged", (state) => {
            numberOfDice = state;
            renderDiceIfNew();
        });
        await numberOfDiceState.initialize(numberOfDice);
        // get initial value. will usually be what you passed in, but it depends how long you were connected to socket beforehand.
        numberOfDice = numberOfDiceState.state;
        renderDiceIfNew();

        // Add onclick listener to "Add dice" button
        const addDiceButton = document.getElementById("add-dice")!;
        addDiceButton.onclick = () => {
            numberOfDiceState.set(numberOfDice + 1);
        };
    } catch (error: unknown) {
        renderError(elem, error);
    }
}

async function renderDiceElement(
    client: LiveShareClient,
    wrapper: HTMLElement,
    diceIndex: number
) {
    const dynamicMapKey = `${diceStateKey}-${diceIndex}`;
    const diceState = await client.getDDS(dynamicMapKey, LiveState<number>);
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
    const diceContainerElem = document.getElementById(diceContainerId)!;
    const rollButton =
        diceContainerElem.querySelector<HTMLButtonElement>(".roll")!;
    const dice = diceContainerElem.querySelector<HTMLDivElement>(".dice")!;

    // Set the value at our dataKey with a random number between 1 and 6.
    rollButton.onclick = () => diceState.set(Math.floor(Math.random() * 6) + 1);

    // Use the changed event to trigger the rerender whenever the value changes.
    const updateDice = () => {
        // Get the current value of the shared data to update the view whenever it changes.
        const diceValue = diceState.state;
        // Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
        dice.textContent = String.fromCodePoint(0x267f + diceValue);
        dice.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
    };
    diceState.on("stateChanged", updateDice);
    // Initialize dice state
    await diceState.initialize(1);
    // Update the UI with the initial value
    updateDice();
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

function renderSideBar(elem: HTMLElement) {
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

function renderSettings(elem: HTMLElement) {
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

errorTemplate["innerHTML"] = `
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

function renderError(elem: HTMLElement, error: unknown) {
    elem.appendChild(errorTemplate.content.cloneNode(true));
    const refreshButton = elem.querySelector<HTMLButtonElement>(".refresh")!;
    const errorText = elem.querySelector<HTMLParagraphElement>(".error-text")!;

    // Refresh the page on click
    refreshButton.onclick = () => {
        window.location.reload();
    };
    console.error(error);
    const errorTextContent =
        error instanceof Error ? error.toString() : JSON.stringify(error);
    errorText.textContent = errorTextContent;
}

start().catch((error) => console.error(error));
