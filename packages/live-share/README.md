# Teams Fluid Extension

Easily create a collaboration app in Teams with [Fluid Framework](https://fluidframework.com/).

## Building the extension

Navigate to the `/javascript` folder and perform:

```bash
npm install --legacy-peer-dep
npm run build
```

This will use lerna to hoist and build all dependencies.

Copy over the binaries (\*.tar.gz) file over to your repo and reference it in you package reference for "@microsoft/teams-interactive".

## How to use this extension

- This package depends on [Teams JS SDK](https://docs.microsoft.com/en-us/javascript/api/overview/msteams-client?view=msteams-client-js-latest) and takes in [Teams user token](https://docs.microsoft.com/en-us/azure/communication-services/quickstarts/manage-teams-identity?pivots=programming-language-csharp) and Teams Context to initialize the container for Teams Fluid Relay service and creates a space with unique ID.
- By default, the ID is a combination of Teams Meeting ID (if in meeting context) or Channel ID (in other contexts), and your AAD App ID (obtained from `aud` claim).

```

import { ... } from "fluid-framework";
import { TeamsCollaborationSpace } from "@microsoft/teams-interactive";
import \* as microsoftTeams from "@microsoft/teams-js";

microsoftTeams.getContext(ctx => {
microsoftTeams.authentication.getAuthToken({successCallback: async (token) => {
// create space based on Teams context
const space = new TeamsCollaborationSpace(token, teamsCtx);
const container = await space.join(fluidContainerSchema);
...
// listen to and send events on container.initialObjects.<DDS>
...

```
