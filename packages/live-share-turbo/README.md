# Microsoft Live Share Turbo

Easily create a collaboration app in Teams with [Fluid Framework](https://fluidframework.com/). This package is an experimental, alternative approach to building Fluid & Live Share applications that attempts to make it simpler to use dynamic distributed-data structures.

In traditional Fluid applications, you must define your Fluid container schema up front. In this package, you load data objects on the fly by simply providing a unique identifier for your object. If a data object matching that identifier exists, the SDK will use that one; otherwise, a new one will be created on your behalf.

Here is a simple example of how to get started:

```javascript
import { app, LiveShareHost } from "@microsoft/teams-js";
import {
    LiveShareTurboClient,
    TurboSharedMap,
} from "@microsoft/live-share-turbo";

// Initialize teams-js (if using Live Share in a Teams application)
await app.initialize();
// Initialize the LiveShareTurboClient and join the session
const host = LiveShareHost.create();
const client = new LiveShareTurboClient(host);
await client.join();
// Setup collaborative objects (e.g., TurboSharedMap) as needed during your application's runtime
const sharedMap = await TurboSharedMap.create(
    client,
    "UNIQUE-KEY",
    (sharedMap) => {
        // Use this optional callback to set initial values for the data object
    }
);
sharedMap.on("valueChanged", (changed, local) => {
    // Update your app to reflect the most recent state
});
```

**Note:** In rare circumstances while using this application -- particularly in cases of high latency while using Fluid's `Shared*` objects -- data loss is possible if multiple users attempt to create new data objects for the same key in short periods of time. We use a last-writer wins conflict resolution for these cases, meaning that the object _may_ be reset to its default/empty state several times, usually in rapid succession. There are strategies you can take to minimize this alongside our built-in mitigation strategies. Depending on your scenario, however, this package might not be a good fit for your application. While many Teams Live Share for synchronizing application state work great with this system, we recommend testing thoroughly before committing this package to production.

If you use React, we recommend using the specially optimized [Live Share React package](../live-share-react/README.md).

You can find our API reference documentation at [aka.ms/livesharedocs](https://aka.ms/livesharedocs).

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install @microsoft/live-share-turbo --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add @microsoft/live-share-turbo
```

## Building the extension

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install
npm run build
```

This will use lerna to hoist and build all dependencies.

## Introduction

There are two clients that you may use depending on your scenario: `LiveShareTurboClient` for Live Share, and `AzureTurboClient` for Azure Fluid Relay. These are used for connecting to Fluid sessions, and are structured differently than the more traditional `LiveShareClient` and `AzureClient` respectively.

The Fluid data objects that are compatible out of the box are as follows:

- `TurboSharedMap` from the `fluid-framework` package.
- `TurboLivePresence` from the `@microsoft/live-share` package.
- `TurboLiveState` from the `@microsoft/live-share` package.
- `TurboLiveEvent` from the `@microsoft/live-share` package.
- `TurboLiveTimer` from the `@microsoft/live-share` package.
- `TurboLiveMediaSession` from the `@microsoft/live-share-media` package.
- `TurboLiveCanvas` from the `@microsoft/live-share-canvas` package.

For each of these objects, you can initialize them using `Turbo*.create(client, uniqueKey, onFirstInitialize)`, where `onFirstInitialize` is optional. Each of the `Turbo*` classes conform to the primary interfaces for their `Shared*` or `Turbo*` counterparts, such as `sharedMap.set(key, value)` or `livePresence.initialize()`.

If you want to use a Fluid object that is not included in this list, such as `SharedTree`, then you can make a class that extends `TurboDataObject` and follow the patterns established by the other `Turbo*` classes.

## Code samples

| Sample name       | Description                                                            | Javascript                                            |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------------------------= |
| Dice Roller Turbo | Enable all connected clients to roll several dice and view the result. | [View](../../samples/javascript/05.dice-roller-turbo) |

## Package Compatibility

TODO

## Contributing

There are several ways you can [contribute](../../CONTRIBUTING.md) to this project:

- [Submit bugs](https://github.com/microsoft/live-share-sdk/issues) and help us verify fixes as they are checked in.
- Review the source code changes.
- Engage with other Live Share developers on [StackOverflow](https://stackoverflow.com/questions/tagged/live-share).
- [Contribute bug fixes](../../CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact opencode@microsoft.com with any additional questions or comments.

## Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) at secure@microsoft.com. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the [MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155) key, can be found in the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under a special [Microsoft](../../LICENSE) License.
