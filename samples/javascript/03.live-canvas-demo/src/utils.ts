/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

export function runningInTeams(): boolean {
    const params = new URLSearchParams(window.location.search);
    const config = params.get("inTeams");

    return config !== null && config.toLowerCase() === "1";
}

export function loadTemplate(template: string, targetElement: HTMLElement) {
    const templateElement = document.createElement("template");
    templateElement["innerHTML"] = template;

    targetElement["innerHTML"] = "";
    targetElement.appendChild(templateElement.content.cloneNode(true));
}

export function toggleElementVisibility(elementId: string, isVisible: boolean) {
    const element = document.getElementById(elementId);

    if (element) {
        element.style.visibility = isVisible ? "visible" : "hidden";
    }
}

export function writeTextToClipboard(text: string, message: string) {
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
