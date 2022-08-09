# Microsoft Live Share Inking

Easily add collaborative inking to your Teams meeting app, powered by [Fluid Framework](https://fluidframework.com/).

This package is an extension of Microsoft Live Share, and requires the `@microsoft/live-share` package. You can find it on NPM [here](https://www.npmjs.com/package/@microsoft/live-share).

You can find our API reference documentation at [aka.ms/livesharedocs](https://aka.ms/livesharedocs).

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install @microsoft/live-share --save
npm install @microsoft/live-share-inking --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add @microsoft/live-share
yarn add @microsoft/live-share-inking
```

## Building the packages

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and run:

```bash
npm install --legacy-peer-dep
npm run build
```

This will use lerna to hoist and build all dependencies.

## How to use this extension

```html
<body style="margin: 0; padding: 20px">
    <!-- Include a host div for the inking surface -->
    <div id="inkingHost" style="width: 800px; height: 800px; border: 1px solid black"></div>
</body>
```

```javascript
import * as microsoftTeams from "@microsoft/teams-js";
import { TeamsFluidClient } from "@microsoft/live-share";
import { SharedInkingSession, InkingManager, InkingTool } from "@microsoft/live-share-inking";

// Initialize the Teams Client SDK
await microsoftTeams.app.initialize();

// Setup the Fluid container
const client = new TeamsFluidClient();
const containerSchema = {
    initialObjects: {
        // Include a SharedInkingSession in your container schema
        inkingSession: SharedInkingSession,
        ...
    }
};

const { container } = await client.joinContainer(containerSchema);

const inkingHost = document.getElementById("inkingHost");
const inkingSession = container.initialObjects.inkingSession as SharedInkingSession;
// Create an InkingManager instance via the SharedInkingSession, and activate it
const inkingManager = inkingSession.synchronize(inkingHost);
inkingManager.activate();

// You can then select tools and setup brushes via the InkingManager instance
document.getElementById("btnPen").onclick = () => {
    inkingManager.tool = InkingTool.Pen;
}

document.getElementById("btnLaserPointer").onclick = () => {
    inkingManager.tool = InkingTool.LaserPointer;
}

document.getElementById("btnPenBrushBlue").onclick = () => {
    inkingManager.penBrush.color = { r: 0, g: 0, b: 255, a: 1};
}

// Other tools and brush settings are available, please refer to the documentation
```

## Code sample

A code sample is available in a seperate GitHub repository.

| Sample name | Description | Javascript |
| -- | -- | -- |
| Live Inking Demo | Basic example showing how to use the SharedInkingSession. | How does this work? What link to put here? |

## Package Compatibility

The Live Share SDK contains dependencies for [@microsoft/teams-js](https://www.npmjs.com/package/@microsoft/teams-js) and [fluid-framework](https://www.npmjs.com/package/fluid-framework) packages among others. Both of these packages are sensitive to the package version your app and libraries use. You will likely run into issues if the package version your app uses doesn't match the version other libraries you depend on use.

**It is critical that your app uses the package dependencies listed in the table below.** Lookup the version of the `@microsoft/live-share` you're using and set any other dependencies in your `package.json` file to match:

| @microsoft/live-share | @microsoft/teams-js  | fluid-framework | @microsoft/live-share-media | @fluidframework/_package-name_ | @microsoft/TeamsFx | @microsoft/TeamsFx-react |
| -- | -- | -- | -- | -- | -- | -- |
| ~0.3.1 | 2.0.0-experimental.0 | ~0.59.0 | ~0.3.1 (optional) | ~0.59.0 (optional) | 2.0.0-experimental.0 (optional) | 2.0.0-experimental.0 (optional) |

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
