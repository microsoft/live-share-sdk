/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function renderError(elem, error, theme) {
    const errorTemplate = document.createElement("template");
    errorTemplate["inner" + "HTML"] = `
    <div class="wrapper ${theme} error">
        <p class="error-title">Something went wrong</p>
        <p class="error-text"></p>
        <button class="refresh"> Try again </button>
    </div>
    `;

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
