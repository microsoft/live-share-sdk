# Live Canvas demo

This repository contains a simple demo of how to use `LiveCanvas` and `InkingManager` to implement a collaborative inking surface.

## Testing Locally in Browser

In the project directory, you can run:

### `npm install`

Installs the latest node packages

### `npm run build`

Builds the app for production to the `dist` folder.\

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
Upon loading, if there is no `/#{id}` in the URL, it will create one and insert it into the URL.\
You can copy this URL and paste it into new browser tabs to test Live Share using a local server.\

## Testing the app in Teams

### Create a ngrok tunnel to allow Teams to reach your tab app

1. [Download ngrok](https://ngrok.com/download).
2. Launch ngrok with port 3000.
   `ngrok http 3000 --host-header=localhost`
3. In a second terminal, run `npm run start:https` (rather than the traditional `npm run start`)

### Create the app package to sideload into Teams

1. Open `.\manifest\manifest.json` and update values in it, including your [Application ID](https://learn.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema#id.
2. You must replace `https://<<BASE_URI_DOMAIN>>` with the https path to your ngrok tunnel.
3. It is recommended that you also update the following fields.
    - Set `developer.name` to your name.
    - Update `developer.websiteUrl` with your website.
    - Update `developer.privacyUrl` with your privacy policy.
    - Update `developer.termsOfUseUrl` with your terms of use.
4. Create a zip file with the contents of `.\manifest` directory so that manifest.json, color.png, and outline.png are in the root directory of the zip file.
    - On Windows, select all files in `.\manifest` directory and compress them to zip.
    - Give your zip file a descriptive name, e.g. `ContosoLiveCanvas`.

### Test it out

1. Schedule a meeting for testing from calendar in Teams.
2. Join the meeting.
3. In the meeting window, tap on **+ Apps** and tap on **Manage apps** in the flyout that opens.
4. In the **Manage apps** pane, tap on **Upload a custom app**.
    - _Don't see the option to **Upload a custom app?!** Follow [instructions here](https://docs.microsoft.com/en-us/microsoftteams/teams-custom-app-policies-and-settings) to enable custom-apps in your tenant._
5. Select the zip file you created earlier and upload it.
6. In the dialog that shows up, tap **Add** to add your sample app into the meeting.
7. Now, back in the meeting window, tap **+ Apps** again and type the name of your app in the _Find an app_ textbox.
8. Select the app to activate it in the meeting.
9. In the configuration dialog, just tap **Save** to add your app into the meeting.
10. In the side panel, tap the share icon to put your app on the main stage in the meeting.
11. That's it! You should now see react-media-template on the meeting stage.
12. Your friends/colleagues invited to the meeting should be able to see your app on stage when they join the meeting.

### Make your own manifest

To make a new app manifest, you can visit the [Teams Developer Portal](https://dev.teams.microsoft.com/).
