# Getting Started

To test, you must either get a URL from the CowatchTokenSample app or add to a Teams app manifest that has SSO support.

For Teams testing, add a urlParam for `inTeams=teams` to the tab settings saved in the `microsoftTeams.setSettings` from your tab configuration page, or the URL shared to the meeting stage.

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
  "description": { "short": "Contoso Video with friends!", "full": "Video up!" },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#FFFFFF",
  "showLoadingIndicator" : true,
  "configurableTabs": [
    {
      "configurationUrl": "{YOUR_APP_ORIGIN}/config?inTeams=true",
      "canUpdateConfiguration": false,
      "scopes": ["groupchat"],
      "context": ["meetingSidePanel", "meetingStage"]
    }
  ],
  "validDomains": [
    "{YOUR_APP_ORIGIN}"
  ],
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

### `yarn install`

Installs the latest node packages

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
