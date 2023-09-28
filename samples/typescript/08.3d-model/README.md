# Countdown Timer sample

![GIF showing the sample functionality](./assets/08-readme-preview-image.gif)

This sample shows how to use [Live Share React](../../../packages/live-share-react) and Fluent UI to create a synchronized countdown timer for users in the Live Share session.

## Getting started

After cloning the repository, you must first set up the npm workspace from the root of the project. Then, run the following commands from the command line:

```bash
npm install
npm run build:packages # Build Live Share packages
cd samples/t*/06*
```

_Note:_ Do not run `npm start` before running `npm run build:packages` from the root of the project, unless you first move the sample out of this npm workspace. When using our samples, you are testing the packages using symlinks, and not the Live Share SDK versions published to npm.

## Testing locally in browser

### `npm run start`

Runs the app in the development mode.

Running `npm run start`, it will do two things: start the `tinylicious` server and start the application using `vite`. If you have never used `tinylicious` before, you should see instead is a prompt saying `Ok to proceed? (y)`, after which you should type `y` and press the "enter" key. In rare cases you might not see the `Ok to proceed? (y)` prompt, in which case try running `npx tinylicious@latest` in your command line directly, and then try again.

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.

Upon loading, if there is no `/#{id}` in the URL, it will create one and insert it into the URL.

You can copy this URL and paste it into new browser tabs to test Live Share using a local server.

**Note:** if testing with HTTPS, such as when using a tunneling service like Ngrok, instead use the command `npm run start-https`.

## Testing the app in Teams

### Create a ngrok tunnel to allow Teams to reach your tab app

1. [Download ngrok](https://ngrok.com/download).
2. Launch ngrok with port 3000.
   `ngrok http 3000 --host-header=localhost` (You will need an ngrok account to use host-header)
3. In a second terminal, run `npm run start-https` (rather than the traditional `npm run start`)

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
    - Give your zip file a descriptive name, e.g. `ContosoMediaTemplate`.

### Test it out

1. Schedule a meeting for testing from calendar in Teams.
2. Join the meeting.
3. In the meeting window, tap on **+ Apps** and tap on **Manage apps** in the flyout that opens.
4. In the **Manage apps** pane, tap on **Upload a custom app**.
    - _Don't see the option to **Upload a custom app?!** Follow [instructions here](https://docs.microsoft.com/microsoftteams/teams-custom-app-policies-and-settings) to enable custom-apps in your tenant._
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

## `npm run build`

Builds the app for production to the `dist` folder.

The build is minified and the filenames include the hashes.
Your app is ready to be deployed!
