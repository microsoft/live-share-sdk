# React Media Template Sample

This repository contains a simple app that enables all connected clients to watch videos together, build a shared playlist, transfer who is in control, and annotate over the video.\
You can use this sample as a template to build a robust media synchronization feature into your app, or use it as an example.\
Each `SharedObject` in our schema (as defined in the `/src/live-share-hooks/useSharedObjects.js` file) has a correlating hook in the live-share-hooks folder.\
We have found this structure to be very useful in composing advanced applications with Live Share using Functional React components, but you can compose this differently for your app.

## Testing Locally in Browser

In the project directory, you can run:

### `npm install`

Installs the latest node packages

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
Upon loading, if there is no `/#{id}` in the URL, it will create one and insert it into the URL.\
You can copy this URL and paste it into new browser tabs to test Live Share using a local server.\
To test the side panel & video queue, you can replace your URL with `/sidepanel#{id}`.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### Known issues when testing in browser

When not in Teams, we don't have a way to know the user's userId, so we generate a random one.\
That means you might not always start out in control of playback, and need to press "Take control".\
Tab configuration page doesn't do anything in browser.

## Testing the app in Teams

There are two options for testing this sample in Teams. The first is to use Ngrok to serve and tunnel the app locally, before zipping the app package.

Alternatively, you can use our ready-to-use [demo app package](../demo-manifests/ContosoMedia.zip). After downloading the zip file, you can skip ahead to the [Test it out](#test-it-out) section.

### Create a ngrok tunnel to allow Teams to reach your tab app

1. [Download ngrok](https://ngrok.com/download).
2. Launch ngrok with port 3000.
   `ngrok http 3000 --host-header=localhost`

### Create the app package to sideload into Teams

1. Open [/manifest/manifest.json](./manifest/manifest.json) and update values in it.
2. You must replace `https://<<BASE_URI_DOMAIN>>` with the https path to your ngrok tunnel.
3. It is recommended that you also update the following fields.
   - Set `developer.name` to your name.
   - Update `developer.websiteUrl` with your website.
   - Update `developer.privacyUrl` with your privacy policy.
   - Update `developer.termsOfUseUrl` with your terms of use.
4. Create a zip file with the contents of `.\manifest` directory so that manifest.json, color.png, and outline.png are in the root directory of the zip file.
   - On Windows, select all files in `.\manifest` directory and compress them to zip.
   - Give your zip file a descriptive name, e.g. `ContosoMediaTemplate`.

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
