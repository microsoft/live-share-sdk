# Dice Roller - Live Share sample

This repository contains a simple app that enables all connected clients to roll a dice and view the result. For a
walkthrough of this example and how it works, check out the [tutorial documentation](https://aka.ms/fluid/tutorial).

## Requirements

Node 12.17+

## Getting started

After cloning the repository, you must first set up the npm workspace from the root of the project. Then, run the following commands from the command line:

```bash
npm install
npm run build:packages # Build Live Share packages
cd samples/j*/01*
```

_Note:_ Do not run `npm start` before running `npm run build:packages` from the root of the project, unless you first move the sample out of this npm workspace. When using our samples, you are testing the packages using symlinks, and not the Live Share SDK versions published to npm.

## Testing locally in browser

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
Upon loading, if there is no `/#{id}` in the URL, it will create one and insert it into the URL.
You can copy this URL and paste it into new browser tabs to test Live Share using a local server.
To test the side panel & video queue, you can replace your URL with `/sidepanel#{id}`.

**Note:** if testing with HTTPS, such as when using a tunneling service like Ngrok, instead use the command `npm run start-https`.

## Testing the app in Teams

### Create a ngrok tunnel to allow Teams to reach your tab app

1. [Download ngrok](https://ngrok.com/download).
2. Launch ngrok with port 3000.
   `ngrok http 3000 --host-header=localhost` (You will need an ngrok account to use host-header)
3. In a second terminal, run `npm run start-https` (rather than the traditional `npm run start`)

### Create the app package to sideload into Teams

1. Open `.\manifest\manifest.json` and update values in it, including your [Application ID](https://learn.microsoft.com/microsoftteams/platform/resources/schema/manifest-schema#id).
2. You must replace `https://<<BASE_URI_DOMAIN>>` with the https path to your ngrok tunnel.
3. It is recommended that you also update the following fields.
    - Set `developer.name` to your name.
    - Update `developer.websiteUrl` with your website.
    - Update `developer.privacyUrl` with your privacy policy.
    - Update `developer.termsOfUseUrl` with your terms of use.
4. Create a zip file with the contents of `.\manifest` directory so that manifest.json, color.png, and outline.png are in the root directory of the zip file.
    - On Windows or Mac, select all files in `.\manifest` directory and compress them.
    - Give your zip file a descriptive name, e.g. `DiceRollerLiveShare`.

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

<img width="216" alt="image" src="https://user-images.githubusercontent.com/7799064/168399675-73e67154-bdde-4d0f-bb8c-bc62aef00e66.png">

11. That's it! You should now see dice-roller on the meeting stage.
    ![image](https://user-images.githubusercontent.com/7799064/168399633-be29ec2b-55db-49ad-a90d-a1011baa8eaa.png)
12. Your friends/colleagues invited to the meeting should be able to see your app on stage when they join the meeting.

## `npm run build`

Builds the app for production to the `dist` folder.

The build is minified and the filenames include the hashes.
Your app is ready to be deployed!
