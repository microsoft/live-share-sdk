# Microsoft Live Share Media

Easily add media synchronization to your Teams meeting app, powered by [Fluid Framework](https://fluidframework.com/).

This package is an extension of Microsoft Live Share, and requires the `@microsoft/live-share` extension. You can find it on NPM [here](https://www.npmjs.com/package/@microsoft/live-share).

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install @microsoft/live-share --save
npm install @microsoft/live-share-media --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add @microsoft/live-share
yarn add @microsoft/live-share-media
```

## Building package

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install --legacy-peer-dep
npm run build
```

This will use lerna to hoist and build all dependencies.

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
import * as microsoftTeams from "@microsoft/teams-js";
import { TeamsFluidClient } from "@microsoft/live-share";
import { EphemeralMediaSession } from "@microsoft/live-share-media";

// Initialize the Teams Client SDK
await microsoftTeams.app.initialize();

// Setup the Fluid container
const client = new TeamsFluidClient();
const schema = {
  initialObjects: {
    mediaSession: EphemeralMediaSession,
    ...,
  },
};
const { container } = await client.joinContainer(schema);
const { mediaSession } = container.initialObjects;

// Get the player from your document and create synchronizer
const player = document.getElementById("player");
const synchronizer = mediaSession.synchronize(player);

// Define roles you want to allow playback control and start sync
const allowedRoles = ["Organizer", "Presenter"];
await mediaSession.start(allowedRoles);

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
| React Video          | Basic example showing how the EphemeralMediaSession object works with HTML5 video.                                                        | [View](https://aka.ms/liveshare-reactvideo)    |
| React Media Template | Enable all connected clients to watch videos together, build a shared playlist, transfer whom is in control, and annotate over the video. | [View](https://aka.ms/liveshare-mediatemplate) |

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
