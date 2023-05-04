# Microsoft Live Share for Azure Communication Services (ACS)

Easily connect to a Live Share session for a Microsoft Teams meeting using ACS, powered by [Fluid Framework](https://fluidframework.com/). This package helps you join a Live Share session from ACS, which will connect them to the same session as users using your application within Teams. Users using your application from within the Microsoft Teams client should use the `LiveShareHost` from the `@microsoft/teams-js` package.

This package does not enable your app to support any existing Live Share app. It is intended for interoperability between the app you publish to the Microsoft Teams Store and your web application powered by ACS. At the moment, we only support external users through ACS; ACS authenticated AAD users are not supported at this time. AAD users must join through Teams to access a Live Share session.

If you are not familiar with Azure Communication Services or Teams interoperability, follow their quick start guide [here](https://learn.microsoft.com/azure/communication-services/quickstarts/identity/access-tokens).

This package is an extension of Microsoft Live Share, and requires the `@microsoft/live-share` extension. You can find it on NPM [here](https://www.npmjs.com/package/@microsoft/live-share).

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-acs @azure/communication-calling@next --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add fluid-framework @fluidframework/azure-client @microsoft/live-share @microsoft/live-share-acs @azure/communication-calling@next
```

## Building package

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install
npm run build
```

This will use NPM Workspaces to hoist and build all dependencies.

## How to use this extension

```javascript
import { CallClient } from "@azure/communication-calling";
import { LiveShareClient, LiveState } from "@microsoft/live-share";
import { ACSLiveShareHost } from "@microsoft/live-share-acs";

/**
 * First, setup the Teams call
 */ 

// Initialize the CallClient
const callClient = new CallClient();
// Get a user access token & userId from your ACS backend and create a credential.
// To learn more, visit https://learn.microsoft.com/azure/communication-services/quickstarts/identity/access-tokens
const communicationUserId = "<ACS USER ID>";
const communicationToken = "<USER ACCESS TOKEN>";
const tokenCredential = new AzureCommunicationTokenCredential(communicationToken);
// Create a call agent using the credential and the user's displayName
const displayName = "<USER DISPLAY NAME>";
callAgent = await callClient.createCallAgent(tokenCredential, { displayName });
// join with meeting link
const meetingLink = "<MEETING JOIN URL>";
const call = callAgent.join({ meetingLink: "<MEETING JOIN URL>" }, {});

/**
 * Next, connect to a Live Share session using the `ACSLiveShareHost`.
 */

// Create a new `ACSLiveShareHost`
const host = ACSLiveShareHost.create({
    communicationUserId,
    displayName,
    call,
    meetingLink,
    communicationTokenProvider: () => Promise.resolve(communicationToken),
});

// Setup the Fluid container
const client = new LiveShareClient(host);
const schema = {
  initialObjects: {
    exampleLiveCount: LiveState,
    ...,
  },
};
const { container } = await client.joinContainer(schema);
const { exampleLiveCount } = container.initialObjects;

/**
 * Finally, start building collaborative features into your app
 */

// LiveState is just one example of a Live Share DDS. For more features & data structures, visit https://aka.ms/teamsliveshare
exampleLiveCount.on("stateChanged", (state, local) => {
    // Update app with new state
});
// Initialize LiveState with your initial state, which can be any JSON serializable value (e.g., object, string, etc.)
await exampleLiveCount.initialize(0);
// Setting state will trigger the stateChanged event listener for everyone in the meeting
exampleLiveCount.set(exampleLiveCount.state + 1);
```

## Contributing

There are several ways you can [contribute](../../CONTRIBUTING.md) to this project:

- [Submit bugs](https://github.com/microsoft/live-share-sdk/issues) and help us verify fixes as they are checked in.
- Review the source code changes.
- Engage with other Live Share developers on [StackOverflow](https://stackoverflow.com/questions/tagged/live-share).
- [Contribute bug fixes](../../CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact opencode@microsoft.com with any additional questions or comments.

## Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) at secure@microsoft.com. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the [MSRC PGP](https://technet.microsoft.com/security/dn606155) key, can be found in the [Security TechCenter](https://technet.microsoft.com/security/default).

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under a special [Microsoft](../../LICENSE) License.
