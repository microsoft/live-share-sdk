/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { View } from "./view";
import { ConfigView } from "./config-view";
import { MainView } from "./main-view";

var view: View;

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const config = params.get("config");

    view = config && config.toLowerCase() === "true" ? new ConfigView() : new MainView();
    view.start();
}

