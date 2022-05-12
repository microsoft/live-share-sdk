# Typescript Teams Collaboration SDK

This will be the future home of the TypeScript SDK. For now, enjoy some contracts for the communication protocol!

# Building SDK

Navigate to the `/javascript` folder and perform:

```bash
npm install --legacy-peer-dep
npm run build
```

This will use lerna to hoist and build all dependencies.

## Basic implementation example

3PP App gets loaded with:

> https://3ppApp.com/playback#teamsCollab=1&teamsCollabToken=eyasdfasdf&teamsCollabSpaceId=call_asdf-asdf-asdf-asdfasdfasd

```typescript
let mediaPlayer = <yourCode>.player;
// Get an SDK instance based on a URI or token provided to you
let collab = CollaborationSDK.initializeFromUri(window.location.origin);
// let isAuth = await collab.auth.isAuthenticated();
// let collab = CollaborationSDK.initializeWithToken(keychain.token);

// // Can potentially be removed if we do this check as part of setupSessionHandler.
// let userState = await collab.getUserState();
// // internally we do collab.collabSpaceId = userState.collabSpaceId
// if (!userState) {
//     // Stop here, no need to connect
//     // You can check again later with the same sdk instance
//     return;
// }

// Connect to the Collab Session.
let sessionHandler = await collab.setupSessionHandler();

// set up an event listener for session change to connect if a new session gets initiated
sessionHandler.on('sessionStart', newSession => appSetupSession(newSession));
sessionHandler.on('sessionEnd', session => appEndSession(session));

let sessions = sessionHandler.getAllSessionsForApp();
if (session.length === 0) {
    // No session active, either wait for sessionStart or create a new session right now
    let session = sessionHandler.createMediaSession(); // A. send post to cloud api to say session has been created; B. SessionCreated event on PPS socket
    setupSession(session);
} else {
    let mediaSession = sessions.find(session => session.type === 'mediaSession');
    let dataSession = sessions.find(session => session.type === 'dataSession');
    setupSession(mediaSession, mediaPlayer);
}

function setupSession(session, mediaPlayer) {
    const mediaState = session.getState();
    mediaPlayer.load(mediaState.url);

    // Handle a Collaboration events
    session.setActionHandler('play', (data, isSelf) => {
        if (!isSelf) {
            mediaPlayer.play();
        }
    });
    session.setActionHandler('seek', data => {
        mediaPlayer.seekTo(data.timestamp);
    });

    // Handle mediaPlayer events
    mediaPlayer.on('pause', () => {
        session.postEvent('pause');
    });
    mediaPlayer.on('play', () => {
        session.postEvent('play');
    });
    mediaPlayer.on('positionUpdate', position => {
        session.setPositionState({ position });
    });
}
```

## Custom Activity handler example

```typescript
async function someCustomCode() {
  class JamysActivitySession implements IActivitySession<StateDataType> {
    // Custom code here
  }

  let sdk: ICollaborationSDK;
  sdk.defineSessionType("jamysActivitySession", JamysActivitySession);
  const sessionHandler = await sdk.connectToSession();

  // On client A
  sessionHandler.createSession<JamysActivitySession>("jamysActivitySession");

  // on Client B if out of band from receiving the sessionChange
  sessionHandler.getCurrentSession<JamysActivitySession>(
    "jamysActivitySession"
  );

  // On client C which handles a sessionChange event
  sessionHandler.on("sessionChange", (event) => {
    if (event.type === "jamysActivitySession") {
      const jSession = event.session as JamysActivitySession;
    }
  });
}
```
