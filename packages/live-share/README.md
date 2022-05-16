# Teams Fluid Extension

Easily create a collaboration app in Teams with [Fluid Framework](https://fluidframework.com/).

## Building the extension

```bash
npm install --legacy-peer-dep
npm run build
```

This will use lerna to hoist and build all dependencies.

Copy over the binaries (\*.tar.gz) file over to your repo and reference it in you package reference for "@microsoft/live-share".

## How to use this extension

- This package depends on [Teams JS SDK](https://docs.microsoft.com/en-us/javascript/api/overview/msteams-client?view=msteams-client-js-latest). The version of `@microsoft/teams-js` you use in your app must match the one used in this project.

```javascript

import { ... } from "fluid-framework";
import { TeamsFluidClient } from "@microsoft/live-share";
import * as microsoftTeams from "@microsoft/teams-js";

// Initialize Teams Client SDK
await microsoftTeams.app.initialize();

// Define Fluid schema
const schema = {
    // Your initial SharedObject for your app
    initialObjects: {
        exampleMap: SharedMap,
        ...,
    },
};
// create space based on Teams context
const client = new TeamsFluidClient();
const { container } = await client.joinContainer(schema);

...
// listen to and send events on container.initialObjects.<DDS>
...

```
