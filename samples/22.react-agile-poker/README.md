# Getting Started

To test, you must either get a URL from the CowatchTokenSample app or add to a Teams app manifest that has SSO support.

For Teams testing, add a urlParam for `inTeams=true` to the tab settings saved in the `microsoftTeams.setSettings` from your tab configuration page, or the URL shared to the meeting stage. This is used by the `useTeamsAuthToken` and `useTeamsCollaborationSpace` hooks; that can be removed in your hooks in production or replaced with a more intelligent browser test harness.

## User Scenario

1. User can asign themselves as the drawer
2. Chosen leader is assigned prompt and can start drawing
3. There is a timer; leader can draw while others can type to guess what the answer is.
4. You get 1 minute to guess. Each person can guess. Higher score if you guess correctly faster. Users can see their leaderboard throughout.
5. Person drawing gets points based on how quickly someone guesses their drawing.
6. After timer is expired and/or everyone has completed the answer, we start the round over from #1. Leaderboard scores are preserved.

### Shared Objects

1. Game state - SharedMap

- Choose self as drawer, drawing phase w/ timer using SharedClock

2. Timer

- Timer...countdown? Take SharedClock and EphemeralEventTimer

3. Leaderboard - use EphemeralPresence

- Self report score

## Example Manifest

To make a new app manifest, you can visit the [Teams Developer Portal](https://dev.teams.microsoft.com/). You can use ngrok to test locally, as long as you update your manifest and AAD registration to match the ngrok URL each time it changes.

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.12/MicrosoftTeams.schema.json",
  "version": "1.0.0",
  "manifestVersion": "1.12",
  "id": "{YOUR_APP_ID}",
  "packageName": "com.package.name",
  "name": { "short": "Flash Cards", "full": "" },
  "developer": {
    "name": "{YOUR_COMPANY_NAME}",
    "mpnId": "",
    "websiteUrl": "{YOUR_COMPANY_WEBSITE}",
    "privacyUrl": "{YOUR_COMPANY_PRIVACY_POLICY}",
    "termsOfUseUrl": "{YOUR_COMPANY_PRIVACY_TERMS}"
  },
  "description": { "short": "Flash cards", "full": "Study hard!" },
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
  "webApplicationInfo": {
    "id": "{YOUR_AAD_APP_IF_USING_SSO}",
    "resource": "{YOUR_AAD_RESOURCE_IF_USING_SSO}"
  },
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

### `npm install`

Installs the latest node packages

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
