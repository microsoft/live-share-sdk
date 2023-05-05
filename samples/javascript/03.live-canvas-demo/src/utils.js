/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export function runningInTeams() {
    const params = new URLSearchParams(window.location.search);
    const config = params.get("inTeams");

    return config !== null && config.toLowerCase() === "1";
}

export function loadTemplate(template, targetElement) {
    const templateElement = document.createElement("template");
    templateElement["innerHTML"] = template;

    targetElement["innerHTML"] = "";
    targetElement.appendChild(templateElement.content.cloneNode(true));
}

export function toggleElementVisibility(elementId, isVisible) {
    const element = document.getElementById(elementId);

    if (element) {
        element.style.visibility = isVisible ? "visible" : "hidden";
    }
}

export function writeTextToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(
        () => {
            alert(message);
        },
        () => {
            alert(
                "The exported data couldn't be copied to the clipboard because permission to do so wasn't granted by the user."
            );
        }
    );
}

export async function parseStrokesFromClipboard() {
    // this will prompt user to consent to read from clipboard. if user denies, this will throw.
    const text = await navigator.clipboard.readText();
    return parseStrokesFromText(text);
}

function parseStrokesFromText(text) {
    const rawJson = JSON.parse(text);
    if (isStrokeList(rawJson)) {
        return rawJson;
    }
    throw Error("Invalid JSON value in clipboard.");
}

function isStrokeList(value) {
    return Array.isArray(value) && value.every(isStroke);
}

function isStroke(value) {
    return (
        typeof value === "object" &&
        !!value &&
        Array.isArray(value.points) &&
        typeof value.brush === "object"
    );
}
