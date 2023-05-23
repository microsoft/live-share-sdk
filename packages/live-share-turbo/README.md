# Microsoft Live Share Turbo

**DISCLAIMER:** This package is in preview and experimental. We are not yet committed to maintaining this package and may make breaking changes at any time. We may decide to move some or all of these features into the main `live-share` package at a future date. Read this package's [license](./LICENSE) for more information.

Easily create collaborative apps, powered by [Fluid Framework](https://fluidframework.com/). This package is an experimental, alternative approach to building Fluid & Live Share applications that attempts to make it simpler to use dynamic distributed-data structures. One of the main benefits of Fluid is the efficient, hierarchal, and ultra-fast remote synchronized application state. Vanilla Fluid is highly customizable, allowing you to nest references to DDS objects within other ones. This is powerful but can be cumbersome to work with. By taking a more opinionated stance, Live Share Turbo makes it easy to leverage dynamic objects more easily than ever before.

In traditional Fluid applications, you must define your Fluid container schema up front. In this package, you load data objects on the fly by simply providing a unique identifier for your object. If a data object matching that identifier exists already exists, the SDK will use that one; otherwise, a new one will be created on your behalf. Fluid Framework's `ConsensusRegisterCollection` object is used to ensure that only one user will create the DDS for each unique identifier.

Here is a simple example of how to get started:

```javascript
import { LiveShareHost } from "@microsoft/teams-js";
import { LiveShareTurboClient } from "@microsoft/live-share-turbo";
import { SharedMap } from "fluid-framework";

// Initialize the LiveShareTurboClient and join the session
const host = LiveShareHost.create();
const client = new LiveShareTurboClient(host);
await client.join();
// Setup collaborative objects (e.g., SharedMap) as needed during your application's runtime
const sharedMap = await client.getDDS(
    "UNIQUE-KEY",
    SharedMap,
    (sharedMap) => {
        // Use this optional callback to set initial values for the data object
        sharedMap.set("foo", "bar");
    }
);
sharedMap.on("valueChanged", (changed, local) => {
    const value = sharedMap.get(changed.key);
    // Update your app to reflect the most recent state
});
```

If you use React, we recommend using the specially optimized [Live Share React package](../live-share-react/README.md).

You can find our API reference documentation at [aka.ms/livesharedocs](https://aka.ms/livesharedocs).

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-turbo --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-turbo --save
```

## Building the extension

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install
npm run build
```

This will use npm workspaces to hoist and build all dependencies.

## Introduction

There are two clients that you may use depending on your scenario: `LiveShareTurboClient` for Live Share, and `AzureTurboClient` for Azure Fluid Relay. These are used for connecting to Fluid sessions, and are structured differently than the more traditional `LiveShareClient` and `AzureClient` respectively. These clients expose a `.getDDS` function, which under the hood uses `DynamicObjectManager` to dynamically get or create a given DDS. It also exposes a default `SharedMap` called `stateMap`, which you can use in your application to track basic app state.

### How this package compares against vanilla Fluid / Live Share

Normally with Fluid you must define the DDS objects you want to use up front in the `ContainerSchema`. This can feel rigid and makes it harder to add new features over time. With Live Share Turbo, you don't need to do that -- though you can -- because it abstracts out some of the more powerful but verbose aspects of Fluid.

The following example shows how you might build a synchronized counter using vanilla Fluid Framework:

```javascript
import { SharedMap } from "fluid-framework";
import { LiveShareClient } from "@microsoft/live-share";
import { LiveShareHost } from "@microsoft/teams-js";

// Initialize LiveShareClient
const host = LiveShareHost.create();
const client = new LiveShareClient(host);
// Define your schema and join the container
const schema = {
  initialObjects: {
    countMap: SharedMap,
  },
}
let count = 0;
async function onFirstInitializeContainer(container) {
    // Set initial value in sharedMap when container is first initialized
    container.initialObjects.countMap.set("count", count);
}
const { container } = await client.joinContainer(schema, onFirstInitializeContainer);
const { countMap } = container.initialObjects;
// Listen for changes to the count and get the initial value
countMap.on("valueChanged", () => {
    count = countMap.get("count");
})
count = countMap.get("count");
// Button handler to increment count
document.getElementById("my-button").onclick = () => {
    countMap.set("count", count + 1);
}
```

This works fine in many situations, but assumes that your `initialObjects` will not change after shipping your app in production. It also assumes that all collaborative objects exist at the time your container is created. Fortunately, Fluid supports something called `dynamicObjectTypes`, which allow you to create new objects on the fly and store references to them within a `SharedMap`, `SharedDirectory`, or `SharedTree`.

Here is a code snippet showing how you might make the above example more scalable using dynamic objects in vanilla Fluid Framework:

```javascript
import { SharedMap } from "fluid-framework";
import { LiveShareClient } from "@microsoft/live-share";
import { LiveShareHost } from "@microsoft/teams-js";

// Initialize LiveShareClient
const host = LiveShareHost.create();
const client = new LiveShareClient(host);
// Define your schema and join the container
const schema = {
  initialObjects: {
    sharedMap: SharedMap
  },
  dynamicObjectTypes: [SharedMap]
}
async function onFirstInitializeContainer(container) {
    // Set initial value for dynamic countMap into sharedMap
    const newCountMap = await container.create(SharedMap);
    container.initialObjects.sharedMap.set("countMap", newCountMap.handle);
    // Set initial count value
    newCountMap.set("count", 0);
};
const { container } = await client.joinContainer(schema, onFirstInitializeContainer);
// Define callback for setting up dynamic countMap
let countMap;
let count = 0;
async function setupCountMap() {
    if (countMap) {
        // if we already have a countMap set, we dispose the object
        countMap.dispose();
    }
    const countMapHandle = countMap.get("countMap");
    if (!countMapHandle) return;
    countMap = await countMapHandle.get();
    // Listen for changes to the count
    countMap.on("valueChanged", () => {
        count = countMap.get("count");
    });
    // Get initial count value
    count = countMap.get("count");
}
// Listen for changes to countMap handle in sharedMap and get initial value
const { sharedMap } = container.initialObjects;
sharedMap.on("valueChanged", async (changed) => {
    if (changed.key === "countMap") {
        setupCountMap();
    }
});
setupCountMap();
// Button handler to increment count
document.getElementById("my-button").onclick = () => {
    if (countMap) {
        countMap.set("count", count + 1);
    }
}
```

The above sample shows why Fluid is so powerful, albeit slightly complicated. The ability to have nested DDS objects in your code allows you to build robust collaborative apps that scale over time. Live Share Turbo leverages the power of dynamic objects with less code. It also makes using `initialObjects` optional.

Here is a simple example showing how you could achieve the same behavior as above using Live Share Turbo:

```javascript
import { LiveShareHost } from "@microsoft/live-share";
import { LiveShareTurboClient } from "@microsoft/live-share-turbo";
import { SharedMap } from "fluid-framework";

// Join the Fluid session
const host = LiveShareHost.create();
const client = LiveShareTurboClient(host);
await client.join();
// Get/create a TurboSharedMap instance that corresponds to a given unique identifier
const countMap = await client.getDDS("countMap", SharedMap, (initialMap) => {
    // Callback to setup initial values when the DDS is first created
    initialMap.set("count", 0);
});
// Listen for changes to the count and get the initial value
let count;
countMap.on("valueChanged", () => {
    count = countMap.get("count");
});
count = countMap.get("count");
// Button handler to increment count
document.getElementById("my-button").onclick = () => {
    countMap.set("count", count + 1);
};
```

### Avoiding data loss

In some circumstances while using this application -- particularly in cases of high latency while using Fluid's `Shared*` objects -- data loss is possible if multiple users attempt to create new data objects for the same key in short periods of time. This is mitigated by using `ConsensusRegisterCollection` to ensure that only one user is responsible for creating each DDS, but this will require more testing before we can have 100% confidence that data loss is not possible.

To minimize this risk, you can also use the `initialObjects` prop when first creating a Fluid container and use identifiers for objects in a list. This has similar constraints as regular Fluid -- such as migrating schemas after first creating the container -- but is useful in scenarios where up-front data loss is unacceptable. Here is an example of how to do this in your application:

```javascript
import { LiveShareHost } from "@microsoft/teams-js";
import { LiveShareTurboClient } from "@microsoft/live-share-turbo";
import { SharedMap } from "fluid-framework";
import { v4 as uuid } from "uuid";

// Join the Fluid session
const host = LiveShareHost.create();
const client = LiveShareTurboClient(host);
const initialObjects = {
    taskBoardMap: SharedMap,
};
await client.join(initialObjects);
// Listen for changes to the task boards and get the initial value
const taskBoardMap = await client.getDDS("taskBoardMap", SharedMap);
let taskBoards;
taskBoardMap.on("valueChanged", () => {
    // Update UI with available task boards
    taskBoards = taskBoardMap.entries();
});
taskBoards = taskBoardMap.entries();

// Button click handler for creating a new task board
document.getElementById("create-task-board").onclick = async () => {
    // Dynamically create a new task list map
    const id = uuid();
    const taskListMap = await client.getDDS(`taskListMap-${id}`, SharedMap);
    // Insert the new task board object into the taskBoardMap
    taskBoardMap.set(id, {
        name: "New list"
    });
    // TODO: Open the task list UI for the newly taskListMap
};
```

**Note**: Depending on your scenario, this package might not be a good fit for your application. While many apps work great with this system, we recommend testing thoroughly before committing this package to production.

### Accessing the Fluid container

If you want to access the Fluid container or audience used by `LiveShareTurboClient` or `AzureTurboClient`, such as to create a Fluid object the "traditional" Fluid way, you can easily access it through the following API:

```javascript
import { LiveShareHost } from "@microsoft/teams-js";
import { LiveShareTurboClient } from "@microsoft/live-share-turbo";

const host = LiveShareHost.create();
const client = LiveShareTurboClient(host);
// Option 1: get from join
const { container, audience } = await client.join();
// Option 2: use client results
if (client.results) {
    const { container, audience } = client.results;
}
```

## Code samples

| Sample name       | Description                                                             | Javascript                                            |
| ----------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Dice Roller Turbo | Enable all connected clients to roll several dice and view the result.  | [View](../../samples/javascript/05.dice-roller-turbo) |

## Package Compatibility

The Live Share SDK contains dependencies for [@microsoft/teams-js](https://www.npmjs.com/package/@microsoft/teams-js) and [fluid-framework](https://www.npmjs.com/package/fluid-framework) packages among others. Both of these packages are sensitive to the package version your app any libraries use. You will likely run into issues if the package version your app uses doesn't match the version other libraries you depend on use.

**It is critical that your app use the package dependencies listed in the table below.** Lookup the version of the `@microsoft/live-share` you're using and set any other dependencies in your package.json file to match:

| @microsoft/live-share | @microsoft/teams-js  | fluid-framework | @microsoft/live-share-\*   | @fluidframework/azure-client | @microsoft/TeamsFx              | @microsoft/TeamsFx-react        |
| --------------------- | -------------------- | --------------- | -------------------------- | ---------------------------- | ------------------------------- | ------------------------------- |
| ^1.0.0                  | ^2.11.0             | ^1.2.3          | ^1.0.0                      | ^1.0.0                       | ^2.5.0                        | ^2.5.0                          |

## Contributing

There are several ways you can [contribute](../../CONTRIBUTING.md) to this project:

- [Submit bugs](https://github.com/microsoft/live-share-sdk/issues) and help us verify fixes as they are checked in.
- Review the source code changes.
- Engage with other Live Share developers on [StackOverflow](https://stackoverflow.com/questions/tagged/live-share).
- [Contribute bug fixes](../../CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact <opencode@microsoft.com> with any additional questions or comments.

## Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) at <secure@microsoft.com>. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the [MSRC PGP](https://technet.microsoft.com/security/dn606155) key, can be found in the [Security TechCenter](https://technet.microsoft.com/security/default).

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under a special [Microsoft](./LICENSE) License.
