/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function inTeams() {
    const currentUrl = window.location.href;
    // Check if using HistoryRouter
    const url = currentUrl.includes("/#/")
        ? new URL(`${window.location.href.split("/#/").join("/")}`)
        : new URL(window.location.href);
    const params = url.searchParams;
    return !!params.get("inTeams");
}
