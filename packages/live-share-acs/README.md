# Microsoft Live Share ACS

**Important:** Live Share for Azure Communication Services is currently in private developer preview. Request access [here](https://aka.ms/liveshareacspreview).

Use [Azure Communication Services Teams interoperability](/azure/communication-services/concepts/teams-interop) in your web application to extend it to Microsoft Teams Live Share. This integration allows Azure Communication Service (ACS) users and Teams meeting users to join the same Live Share session for seamless collaboration.

This package is an extension of Microsoft Live Share, and requires the `@microsoft/live-share` extension. You can find it on NPM [here](https://www.npmjs.com/package/@microsoft/live-share).

You can find our API reference documentation at [aka.ms/livesharedocs](https://aka.ms/livesharedocs).

## Installing

To add the latest version of the SDK to your application using NPM:

```bash
npm install @microsoft/live-share fluid-framework @fluidframework/azure-client --save
npm install @microsoft/live-share-acs @azure/communication-calling@next --save
npm install @microsoft/teams-js --save
```

or using [Yarn](https://yarnpkg.com/):

```bash
yarn add @microsoft/live-share fluid-framework @fluidframework/azure-client
yarn add @microsoft/live-share-acs @azure/communication-calling@next
yarn add @microsoft/teams-js
```

## Building package

After cloning the [GitHub repository](https://www.github.com/microsoft/live-share-sdk), navigate to the root folder and perform:

```bash
npm install
npm run build
```

This will use npm workspaces to hoist and build all dependencies.

## How to use this extension

In this article, you'll learn how to integrate the `@microsoft/live-share-acs` package with the `LiveShareClient` to join a Live Share session for a Teams meeting. You'll also discover how to join the meeting's Live Share session through your Microsoft Teams meeting extension. Let's start!

### Pre-requisites

1. [Request access](https://aka.ms/liveshareacspreview) to the Live Share for Azure Communication Services private preview.
2. Understand the [Azure Communication Services Teams interoperability](/azure/communication-services/concepts/teams-interop) by reading the documentation.
3. Complete the [Live Share quick start guide](../teams-live-share-quick-start.md).

#### Install the JavaScript dependencies

First, install [@microsoft/live-share](https://github.com/microsoft/live-share-sdk) and its peer dependencies, including `fluid-framework` and `@fluidframework/azure-client`. Then, install the `@microsoft/live-share-acs` package and its peer dependency, the `@azure/communication-calling@next` package. If you're using Live Share in your tab application, install `@microsoft/teams-js` version 2.11.0 or newer.

##### npm

```bash
npm install @microsoft/live-share fluid-framework @fluidframework/azure-client --save
npm install @microsoft/live-share-acs @azure/communication-calling@next --save
npm install @microsoft/teams-js --save
```

##### yarn

```bash
yarn add @microsoft/live-share fluid-framework @fluidframework/azure-client
yarn add @microsoft/live-share-acs @azure/communication-calling@next
yarn add @microsoft/teams-js
```

### Join a session

When initializing `LiveShareClient`, use the `ILiveShareHost` property to connect the `LiveShareClient` class to a Live Share session. For example, the `TestLiveShareHost` class joins a session using a `localhost` test server.

To have meeting participants join a Live Share session through your Azure Communication Services application, use the `ACSTeamsLiveShareHost` class from the `@microsoft/live-share-acs` package. For users joining the meeting through the Teams client, your tab application can connect to the session using the `LiveShareHost` class from the `@microsoft/teams-js` library.

> [!NOTE]
> Live Share doesn't support AAD users joining through Azure Communication Services. AAD users must join a meeting through the Microsoft Teams client to join a Live Share session.

Here's an example of how you can implement this in your application:

**JavaScript**

```javascript
import { LiveShareClient, LiveState } from "@microsoft/live-share";
import { ACSTeamsLiveShareHost } from "@microsoft/live-share-acs";
import { app, LiveShareHost } from "@microsoft/teams-js";
import { CallClient } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";

async function joinSession(host) {
    const client = new LiveShareClient(host);
    const schema = {
        initialObjects: {
            liveState: LiveState,
        },
    };
    const { container } = await client.joinContainer(schema);

    // ... ready to start app sync logic
}

async function joinFromTeams() {
    // Initialize teams-js
    await app.initialize();
    // Create Teams LiveShareHost
    const host = LiveShareHost.create();
    // Join the Live Share session
    await joinSession(host);
}

async function joinFromACS() {
    // Initialize your ACS CallClient
    const callClient = new CallClient();
    // Get a token credential & user ID from your server and create a token credential
    const userACSToken = "<USER ACCESS TOKEN>";
    const userACSId = "<USER_COMMUNICATION_USER_ID>";
    const tokenCredential = new AzureCommunicationTokenCredential(userACSToken);
    // Create a call agent
    const userDisplayName = "<USER_DISPLAY_NAME";
    const callAgent = await callClient.createCallAgent(tokenCredential, {
        displayName: userDisplayName,
    });
    // Get the meeting join URL
    const meetingJoinUrl = "<MEETING JOIN URL>";
    // Join the Teams meeting
    const teamsCall = callAgent.join({ meetingLink: meetingJoinUrl }, {});
    // Create the ACSTeamsLiveShareHost
    const host = ACSTeamsLiveShareHost.create({
        userId: userACSId,
        displayName: userDisplayName,
        call: teamsCall,
        teamsMeetingJoinUrl: meetingJoinUrl,
        acsTokenProvider: () => {
            // In production, you likely want to refresh the token.
            // Refer to the Azure Communication Services documentation for examples of this.
            return Promise.resolve(userACSToken);
        },
    });
    // Join the Live Share session
    await joinSession(host);

    // ... other ACS call setup
}

// First, we must know if your user is joining a session from ACS or Teams.
// A common pattern is deploying two versions of your app, such as teams.contoso.com and app.contoso.com or using environment variables
const IN_TEAMS = window.location.origin.includes("teams.");

if (IN_TEAMS) {
    joinFromTeams();
} else {
    joinFromACS();
}
```

**TypeScript**

```TypeScript
import { LiveShareClient, LiveState, ILiveShareHost } from "@microsoft/live-share";
import { ACSTeamsLiveShareHost } from "@microsoft/live-share-acs";
import { app, LiveShareHost } from "@microsoft/teams-js";
import { CallClient } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';

async function joinSession(host: ILiveShareHost): Promise<void> {
    const client = new LiveShareClient(host);
    const schema = {
        initialObjects: {
            liveState: LiveState,
        },
    };
    const { container } = await client.joinContainer(schema);

    // ... ready to start app sync logic
}

async function joinFromTeams(): Promise<void> {
    // Initialize teams-js
    await app.initialize();
    // Create Teams LiveShareHost
    const host = LiveShareHost.create();
    // Join the Live Share session
    await joinSession(host);
}

async function joinFromACS(): Promise<void> {
    // Initialize your ACS CallClient
    const callClient = new CallClient();
    // Get a token credential & user ID from your server and create a token credential
    const userACSToken = "<USER ACCESS TOKEN>";
    const userACSId = "<USER_COMMUNICATION_USER_ID>";
    const tokenCredential = new AzureCommunicationTokenCredential(userACSToken);
    // Create a call agent
    const userDisplayName = "<USER_DISPLAY_NAME";
    const callAgent = await callClient.createCallAgent(tokenCredential, {
        displayName: userDisplayName,
    });
    // Get the meeting join URL
    // NOTE: if the meeting join URL is shortened (e.g., https://teams.microsoft.com/meet/{id}?p={password}), then
    // you must manually construct the long meeting url. This is a recent change for anonymous user calendar invites.
    // See the "Long Meeting Join URL update" section of this README for more info.
    const longMeetingJoinUrl = "<LONG MEETING JOIN URL>";
    // Join the Teams meeting
    const teamsCall = callAgent.join({meetingLink: meetingJoinUrl}, {});
    // Create the ACSTeamsLiveShareHost
    const host = ACSTeamsLiveShareHost.create({
        userId: userACSId,
        displayName: userDisplayName,
        call: teamsCall,
        teamsMeetingJoinUrl: longMeetingJoinUrl,
        acsTokenProvider: () => {
            // In production, you likely want to refresh the token.
            // Refer to the Azure Communication Services documentation for examples of this.
            return Promise.resolve(userACSToken)
        },
    });
    // ... other ACS call setup

    // Join the Live Share session
    await joinSession(host);
}

// First, we must know if your user is joining a session from ACS or Teams.
// A common pattern is deploying two versions of your app, such as teams.contoso.com and app.contoso.com or using environment variables
const IN_TEAMS = window.location.origin.includes("teams.");

if (IN_TEAMS) {
    joinFromTeams();
} else {
    joinFromACS();
}
```

#### Long Meeting Join URL update

In 2024, Microsoft Teams changed the meeting join URL format for calendar invites. The APIs this feature depends on relies on having a long meeting join URL; for now, short URLs will not work.

Here is an example of a short join URL: `https://teams.microsoft.com/meet/${meetingId}?p=${joinPasscode}`.
Here is an example of a long join URL: `https://teams.microsoft.com/l/meetup-join/${threadId}/0?context=${encodedJSONContext}`

If you only have access to the short URL for whatever reason, you must manually construct a join URL, like this:

```TypeScript
const threadId = 'TEAMS_THREAD_ID'; // e.g., `19:meeting_{SOME_ID}@thread.v2`, may need to get from Graph
const tenantId = 'MEETING_ORGANIZER_TENANT_ID';  // e.g., tenant AAD identifier parsed from AAD token of meeting organizer
const organizerId = ''; // e.g., user's AAD identifier parsed from AAD token of meeting organizer
const context = {
  Tid: tenantId,
  Oid: organizerId,
};
const encodedContext = encodeURIComponent(JSON.parse(context));
const longJoinUrl = `https://teams.microsoft.com/l/meetup-join/${threadId}/0?context=${encodedContext}`;
```

### Why use Live Share with Azure Communication Services?

Integrating Live Share into your app can enhance collaboration between your agents and customers, particularly if your business provides customer services. Here are a few examples of how `ACSTeamsLiveShareHost` can be implemented in your application:

-   Facilitate co-browsing of your website between your support agents and customers.
-   Enable your retail agents and digital shoppers to co-shop on your e-commerce website.
-   Provide onboarding assistance through your sales representatives for new customers.
-   Allow co-watching of high-quality promotional videos during sales calls.

## Code samples

There is one code sample that is hosted in a separate GitHub repository. You can also learn more about Live Share using our other [samples](../../samples).

| Sample name | Description                                 | Javascript                                             |
| ----------- | ------------------------------------------- | ------------------------------------------------------ |
| Teams ACS   | Basic example showing how to use Teams ACS. | [View](https://github.com/ryanbliss/acs-cobrowse-demo) |

## Package Compatibility

The Live Share SDK contains dependencies for [@microsoft/teams-js](https://www.npmjs.com/package/@microsoft/teams-js) and [fluid-framework](https://www.npmjs.com/package/fluid-framework) packages among others. Both of these packages are sensitive to the package version your app any libraries use. You will likely run into issues if the package version your app uses doesn't match the version other libraries you depend on use.

**It is critical that your app use the package dependencies listed in the table below.** Lookup the version of the `@microsoft/live-share` you're using and set any other dependencies in your package.json file to match:

| @microsoft/live-share | @microsoft/teams-js | fluid-framework | @microsoft/live-share-\* | @fluidframework/azure-client | @microsoft/TeamsFx | @microsoft/TeamsFx-react |
| --------------------- | ------------------- | --------------- | ------------------------ | ---------------------------- | ------------------ | ------------------------ |
| ^1.0.0                | ^2.11.0             | ^1.2.3          | ^1.0.0                   | ^1.0.0                       | ^2.5.0             | ^2.5.0                   |

## Contributing

There are several ways you can [contribute](../../CONTRIBUTING.md) to this project:

-   [Submit bugs](https://github.com/microsoft/live-share-sdk/issues) and help us verify fixes as they are checked in.
-   Review the source code changes.
-   Engage with other Live Share developers on [StackOverflow](https://stackoverflow.com/questions/tagged/live-share).
-   [Contribute bug fixes](../../CONTRIBUTING.md).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact <opencode@microsoft.com> with any additional questions or comments.

## Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft Security Response Center (MSRC) at <secure@microsoft.com>. You should receive a response within 24 hours. If for some reason you do not, please follow up via email to ensure we received your original message. Further information, including the [MSRC PGP](https://technet.microsoft.com/security/dn606155) key, can be found in the [Security TechCenter](https://technet.microsoft.com/security/default).

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under a special [Microsoft](./LICENSE) License.
