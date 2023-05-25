# Microsoft Live Share Media

Easily add media synchronization to your Teams meeting app, powered by [Fluid Framework](https://fluidframework.com/).

This package is an extension of Microsoft Live Share, and requires the `@microsoft/live-share` extension. You can find it on NPM [here](https://www.npmjs.com/package/@microsoft/live-share).

You can find our API reference documentation at [aka.ms/livesharedocs](https://aka.ms/livesharedocs).

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-media --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-media
```

## Building package

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install
npm run build
```

This will use npm workspaces to hoist and build all dependencies.

## How to use this extension

```html
<body>
  <video id="player">
    <source src="YOUR_VIDEO_SRC" type="video/mp4" />
  </video>
  <div class="player-controls">
    <button id="play-button">Play</button>
    <button id="pause-button">Pause</button>
    <button id="restart-button">Restart</button>
    <button id="change-track-button">Change track</button>
  </div>
</body>
```

```javascript
import { app, LiveShareHost } from "@microsoft/teams-js";
import { LiveShareClient } from "@microsoft/live-share";
import { LiveMediaSession } from "@microsoft/live-share-media";

// Initialize the Teams Client SDK
await microsoftTeams.app.initialize();

// Setup the Fluid container
const host = LiveShareHost.create();
const client = new LiveShareClient(host);
const schema = {
  initialObjects: {
    mediaSession: LiveMediaSession,
    ...,
  },
};
const { container } = await client.joinContainer(schema);
const { mediaSession } = container.initialObjects;

// Get the player from your document and create synchronizer
const player = document.getElementById("player");
const synchronizer = mediaSession.synchronize(player);

// Define roles you want to allow playback control and initialize sync
const allowedRoles = ["Organizer", "Presenter"];
await mediaSession.initialize(allowedRoles);

// Intercept user play, pause, seek, and set track actions through synchronizer

document.getElementById("play-button").onclick = () => {
  synchronizer.play();
};

document.getElementById("pause-button").onclick = () => {
  synchronizer.pause();
};

document.getElementById("restart-button").onclick = () => {
  synchronizer.seekTo(0);
};

document.getElementById("change-track-button").onclick = () => {
  synchronizer.setTrack({
    trackIdentifier: "SOME_OTHER_VIDEO_SRC",
  });
};
```

## Code samples

There are several code samples that are hosted in a separate GitHub repository.

| Sample name          | Description                                                                                                                               | Javascript                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| React Video          | Basic example showing how the LiveMediaSession object works with HTML5 video.                                                        | [View](https://aka.ms/liveshare-reactvideo)    |
| React Media Template | Enable all connected clients to watch videos together, build a shared playlist, transfer whom is in control, and annotate over the video. | [View](https://aka.ms/liveshare-mediatemplate) |

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
