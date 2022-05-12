# Getting Started

For Teams testing, add a urlParam for `inTeams=true` to the tab settings saved in the `microsoftTeams.setSettings` from your tab configuration page, or the URL shared to the meeting stage. You can also test locally, per the instructions below.

## Example Manifest

To make a new app manifest, you can visit the [Teams Developer Portal](https://dev.teams.microsoft.com/). You can use ngrok to test locally, as long as you update your manifest and AAD registration to match the ngrok URL each time it changes.

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.12/MicrosoftTeams.schema.json",
  "version": "1.0.0",
  "manifestVersion": "1.12",
  "id": "{YOUR_APP_ID}",
  "packageName": "com.package.name",
  "name": { "short": "Contoso", "full": "Contoso Video" },
  "developer": {
    "name": "{YOUR_COMPANY_NAME}",
    "mpnId": "",
    "websiteUrl": "{YOUR_COMPANY_WEBSITE}",
    "privacyUrl": "{YOUR_COMPANY_PRIVACY_POLICY}",
    "termsOfUseUrl": "{YOUR_COMPANY_PRIVACY_TERMS}"
  },
  "description": {
    "short": "Contoso Video with friends!",
    "full": "Video up!"
  },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#FFFFFF",
  "showLoadingIndicator": true,
  "configurableTabs": [
    {
      "configurationUrl": "{YOUR_APP_ORIGIN}/config?inTeams=true",
      "canUpdateConfiguration": false,
      "scopes": ["groupchat"],
      "context": ["meetingSidePanel", "meetingStage"]
    }
  ],
  "validDomains": ["{YOUR_APP_ORIGIN}"],
  "authorization": {
     "permissions": {
        "resourceSpecific": [
          { "name": "ChannelMeetingStage.Write.Group", "type": "Delegated" },
          { "name": "MeetingStage.Write.Chat", "type": "Delegated" }
      ]
    }
  }
}
```

## Available Scripts

In the project directory, you can run:

### Package installation

Follow these [https://github.com/OfficeDev/Teams-Collaboration-SDK/tree/main/javascript](instructions).

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

If testing locally a browser, this will start both a Azure Fluid Relay test server as well as the app. Once it loads, it will insert a UUID into the URL with a # parameter. To test video synchronization, copy that URL into a new browser tab and they should be in sync.

The page will reload when you make changes, but you will need to manually reload the page as well.
You may also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
