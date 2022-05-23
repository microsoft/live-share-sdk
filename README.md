# Live Share SDK

The Live Share SDK is in preview. You will need to be part of the [Developer Preview Program](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/dev-preview/developer-preview-intro) for Microsoft Teams to use this feature.

The Live Share SDK builds on the [Fluid Framework](https://fluidframework.com/) to enable the creation of collaborative experiences for Microsoft Teams and M365. This preview version focuses on building collaborative meeting applications for Microsoft Teams using Fluid. The SDK provides a `TeamsFluidClient` class for connecting to a special Fluid Container associated with each meeting. A collection of Live Share specific Distributed Data Structure classes are also provided to simplify building applications for common meeting scenarios like shared media playback.

To get started, we recommend first familiarizing yourself with the [Fluid Framework](https://fluidframework.com/docs/) and building [Teams Meeting Apps](https://docs.microsoft.com/en-us/microsoftteams/platform/apps-in-teams-meetings/teams-apps-in-meetings). You can then follow our Quick Start Guide to build your first Teams Meeting App that uses Live Share.

You can find our API reference documentation at [aka.ms/livesharedocs](https://aka.ms/livesharedocs).

## Package Compatibility

The Live Share SDK contains dependencies for [@microsoft/teams-js](https://www.npmjs.com/package/@microsoft/teams-js) and [fluid-framework](https://www.npmjs.com/package/fluid-framework) packages among others. Both of these packages are sensitive to the package version your app any libraries use. You will likely run into issues if the package version your app uses doesn't match the version otehr libraries you depend on use.

**It is critical that your app use the package dependencies listed in the table below.** Lookup the version of the `@microsoft/live-share-sdk` you're using and set any dependencies for `@microsoft/teams-js` or `fluid-framework` in your package.json file to match:

| @microsoft/live-share | @microsoft/teams-js   | fluid-framework |
| --------------------- | --------------------- | --------------- |
| ~0.2.0                | ~2.0.0-experimental.0 | ~0.59.0         |

## Installing

### Live Share

To add the latest version of the SDK to your application using NPM:

```bash
npm install @microsoft/live-share --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add @microsoft/live-share
```

### Live Share Media

Optionally, to add the latest version of the media package to your application using NPM:

```bash
npm install @microsoft/live-share-media --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add @microsoft/live-share-media
```

## Contributing

There are several ways you can [contribute](./CONTRIBUTING.md) to this project:

- [Submit bugs](https://github.com/microsoft/live-share-sdk/issues) and help us verify fixes as they are checked in.
  - (Please review [FAQ and Known issues](https://github.com/microsoft/live-share-sdk/issues/8) before filing a new item!)
- Review the source code changes.
- Engage with other Live Share developers on [StackOverflow](https://stackoverflow.com/questions/tagged/live-share).
- [Contribute bug fixes](./CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact opencode@microsoft.com with any additional questions or comments.

## Preparing the Repository

To clone the repository to test samples and/or build the packages, ensure that you have the latest versions of [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/) installed.

Clone a copy of the repo:

```bash
git clone https://github.com/microsoft/live-share-sdk.git
```

Change to the live-share-sdk directory:

```bash
cd live-share-sdk
```

## Building Packages & Samples

To build the projects packages (with symlinks to the locally built packages), we use Lerna to prevent dependency errors.

Install all developer dependencies:

```bash
npm install
```

Build packages and samples:

```bash
npm run build
```

Run the sample of of your choice:

```bash
cd samples/01.dice-roller
npm start
```

Unit tests for all of the packages can be run using `npm run test` or `npm run test:debug`. Any previously built files can be deleted prior to building by first running `npm run clean`.

## Code samples

There are several code samples available to use:

| Sample name          | Description                                                                                                                               | Javascript                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Dice Roller          | Enable all connected clients to roll a dice and view the result.                                                                          | [View](./samples/01.dice-roller/README.md)          |
| React Video          | Basic example showing how the EphemeralMediaSession object works with HTML5 video.                                                        | [View](./samples/02.react-video/README.md)          |
| React Media Template | Enable all connected clients to watch videos together, build a shared playlist, transfer whom is in control, and annotate over the video. | [View](./samples/21.react-media-template/README.md) |
| Agile Poker          | Enable all connected clients to play an Agile Poker planning activity.                                                                    | [View](./samples/22.react-agile-poker/README.md)    |

## Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) at secure@microsoft.com. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the [MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155) key, can be found in the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).

## Licensing & Copyright

Copyright (c) Microsoft Corporation. All rights reserved.

Live Share packages are licensed under a special [Microsoft Live Share SDK license](./LICENSE).

Code samples are licensed separately under [MIT license](./samples/LICENSE).
